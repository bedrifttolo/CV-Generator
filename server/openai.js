const OPENAI_URL = 'https://api.openai.com/v1/responses'

function outputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') return content.text
    }
  }
  return ''
}

export async function requestStructuredOutput({ name, schema, system, user }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('AI er ikke konfigurert på serveren.')
    error.code = 'AI_NOT_CONFIGURED'
    throw error
  }
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      text: {
        format: {
          type: 'json_schema',
          name,
          strict: true,
          schema,
        },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error('OpenAI request failed', response.status, detail.slice(0, 500))
    const error = new Error('AI-tjenesten svarte ikke som forventet.')
    error.code = 'AI_REQUEST_FAILED'
    throw error
  }
  const payload = await response.json()
  const text = outputText(payload)
  if (!text) {
    const error = new Error('AI-tjenesten returnerte ikke noe resultat.')
    error.code = 'AI_EMPTY_RESPONSE'
    throw error
  }
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('AI-resultatet kunne ikke valideres.')
    error.code = 'AI_INVALID_RESPONSE'
    throw error
  }
}
