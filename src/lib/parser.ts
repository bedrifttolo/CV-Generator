import type { CvData, Education, Experience } from '../types'

const sectionAliases: Record<string, string> = {
  profil: 'summary',
  sammendrag: 'summary',
  'om meg': 'summary',
  arbeidserfaring: 'experience',
  erfaring: 'experience',
  utdanning: 'education',
  kompetanse: 'skills',
  ferdigheter: 'skills',
  nøkkelkompetanse: 'skills',
  språk: 'languages',
  referanser: 'references',
  referanse: 'references',
}

const cleanLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

export async function extractFileText(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Filen er større enn 10 MB.')
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'txt') return file.text()
  if (extension === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }
  if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: string[] = []
    for (let index = 1; index <= Math.min(document.numPages, 8); index += 1) {
      const page = await document.getPage(index)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
    }
    return pages.join('\n')
  }
  throw new Error('Bruk PDF, DOCX eller TXT.')
}

const isPeriod = (line: string) =>
  /(?:19|20)\d{2}\s*(?:[-–—]|til)\s*(?:nå|d\.d\.|(?:19|20)\d{2})/i.test(line)

export function parseResume(text: string, fallback: CvData): CvData {
  const lines = cleanLines(text)
  if (!lines.length) throw new Error('Vi fant ingen lesbar tekst i filen.')

  const buckets: Record<string, string[]> = {
    root: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    languages: [],
    references: [],
  }
  let current = 'root'
  lines.forEach((line) => {
    const normalized = line.toLowerCase().replace(/[:.]/g, '').trim()
    const key = sectionAliases[normalized]
    if (key) current = key
    else buckets[current].push(line.replace(/^[•·▪–-]\s*/, ''))
  })

  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? fallback.email
  const phone = text.match(/(?:\+47\s*)?(?:\d[\s-]*){8}/)?.[0]?.trim() ?? fallback.phone
  const website = text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:no|com|io|dev)(?:\/\S*)?/i)?.[0] ?? fallback.website
  const root = buckets.root.filter((line) => !line.includes(email) && !line.includes(phone))
  const name = root.find((line) => /^[A-ZÆØÅ][\p{L}'-]+(?:\s+[A-ZÆØÅ][\p{L}'-]+){1,3}$/u.test(line)) ?? root[0] ?? fallback.name
  const title = root.find((line) => line !== name && line.length < 90 && !line.includes('@')) ?? fallback.title

  const experience: Experience[] = []
  let activeExperience: Experience | null = null
  buckets.experience.forEach((line, index) => {
    if (isPeriod(line) || (!activeExperience && index < 2)) {
      if (activeExperience) experience.push(activeExperience)
      activeExperience = {
        id: `import-exp-${index}`,
        role: isPeriod(line) ? 'Stilling' : line.split(/\s+[–—|-]\s+/)[0],
        company: isPeriod(line) ? 'Arbeidsgiver' : line.split(/\s+[–—|-]\s+/)[1] ?? 'Arbeidsgiver',
        period: isPeriod(line) ? line : '',
        bullets: [],
      }
    } else if (activeExperience) {
      if (isPeriod(line)) activeExperience.period = line
      else activeExperience.bullets.push(line)
    }
  })
  if (activeExperience) experience.push(activeExperience)

  const education: Education[] = []
  for (let index = 0; index < buckets.education.length; index += 3) {
    const group = buckets.education.slice(index, index + 3)
    if (group.length) {
      education.push({
        id: `import-edu-${index}`,
        degree: group[0],
        school: group.find((line) => !isPeriod(line) && line !== group[0]) ?? '',
        period: group.find(isPeriod) ?? '',
      })
    }
  }

  return {
    ...fallback,
    name,
    title,
    email,
    phone,
    website,
    summary: buckets.summary.join(' ') || fallback.summary,
    skills: buckets.skills.length
      ? buckets.skills.flatMap((line) => line.split(/[,;|]/)).map((skill) => skill.trim()).filter(Boolean).slice(0, 14)
      : fallback.skills,
    languages: buckets.languages.length ? buckets.languages.slice(0, 6) : fallback.languages,
    references: buckets.references.length ? buckets.references.slice(0, 6) : fallback.references,
    experience: experience.length ? experience.slice(0, 8) : fallback.experience,
    education: education.length ? education.slice(0, 5) : fallback.education,
  }
}
