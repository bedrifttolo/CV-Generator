import { importJobFromUrl } from '../../server/job-import.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Bruk POST for å importere en stilling.', code: 'METHOD_NOT_ALLOWED' })
  }
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!url || url.length > 2_048) return response.status(400).json({ error: 'Denne lenken ser ikke gyldig ut.', code: 'INVALID_URL' })
    const job = await importJobFromUrl(url)
    return response.status(200).json({ job })
  } catch (error) {
    const code = error?.code || 'IMPORT_FAILED'
    const status = ['INVALID_URL', 'BLOCKED_URL'].includes(code) ? 400 : code === 'PAGE_TOO_LARGE' ? 413 : 422
    console.error('Job import failed', code, error?.message)
    return response.status(status).json({
      error: status === 422 ? 'Vi fikk ikke tilgang til hele annonsen. Lim inn annonseteksten manuelt i stedet.' : error?.message || 'Annonsen kunne ikke hentes.',
      code,
    })
  }
}
