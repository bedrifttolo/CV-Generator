import { decodeCvPdfPayload, fromStructuredImportText, toStructuredImportText } from './cv-payload'
import { normalizeCv } from './document'
import { ensurePromiseWithResolvers } from './promise-compat'
import type { CvData, Education, Experience, Project, Reference, SkillGroup } from '../types'

const sectionAliases: Record<string, string> = {
  profil: 'summary',
  sammendrag: 'summary',
  'om meg': 'summary',
  profile: 'summary',
  summary: 'summary',
  'professional summary': 'summary',
  arbeidserfaring: 'experience',
  erfaring: 'experience',
  arbeidspraksis: 'experience',
  experience: 'experience',
  'work experience': 'experience',
  employment: 'experience',
  utdanning: 'education',
  education: 'education',
  kompetanse: 'skills',
  ferdigheter: 'skills',
  nøkkelkompetanse: 'skills',
  skills: 'skills',
  expertise: 'skills',
  språk: 'languages',
  languages: 'languages',
  referanser: 'references',
  referanse: 'references',
  references: 'references',
  kontakt: 'root',
  contact: 'root',
  lenker: 'ignored',
  'dokumenterte resultater': 'ignored',
  'utvalgte prosjekter': 'projects',
  'mine prosjekter': 'projects',
  prosjekter: 'projects',
  projects: 'projects',
  'slik jobber jeg': 'ignored',
}

const cleanLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

let pdfWorker: Worker | null = null

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
    ensurePromiseWithResolvers()
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    if (!pdfWorker && typeof Worker !== 'undefined') {
      pdfWorker = new Worker(new URL('./pdfjs-worker.ts', import.meta.url), { type: 'module' })
    }
    if (pdfWorker) pdfjs.GlobalWorkerOptions.workerPort = pdfWorker
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() })
    try {
      const pdf = await loadingTask.promise
      const metadata = await pdf.getMetadata().catch(() => null)
      const info = metadata?.info as { Subject?: unknown } | undefined
      const embeddedCv = decodeCvPdfPayload(info?.Subject)
      if (embeddedCv) return toStructuredImportText(embeddedCv)

      const pages: string[] = []
      for (let index = 1; index <= Math.min(pdf.numPages, 8); index += 1) {
        const page = await pdf.getPage(index)
        const content = await page.getTextContent()
        const lines: string[] = []
        let line = ''
        let previousY: number | null = null
        content.items.forEach((item) => {
          if (!('str' in item) || !item.str.trim()) return
          const y = item.transform[5]
          if (previousY !== null && Math.abs(y - previousY) > 2 && line.trim()) {
            lines.push(line.trim())
            line = ''
          }
          line += `${line ? ' ' : ''}${item.str.trim()}`
          previousY = y
          if (item.hasEOL) {
            lines.push(line.trim())
            line = ''
            previousY = null
          }
        })
        if (line.trim()) lines.push(line.trim())
        pages.push(lines.join('\n'))
      }
      const extracted = pages.join('\n').trim()
      if (!extracted) {
        throw new Error('PDF-en inneholder ikke lesbar tekst. Nye PDF-er fra CVklar kan importeres direkte; for eldre bilde-PDF-er må du bruke originalfilen eller TXT/DOCX.')
      }
      return extracted
    } finally {
      await loadingTask.destroy()
    }
  }
  throw new Error('Bruk PDF, DOCX eller TXT.')
}

const periodPattern = /(?:(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember|january|february|march|may|june|july|october|december)\s+)?(?:19|20)\d{2}\s*(?:[-–—]|til|to)\s*(?:nå|i dag|d\.d\.|present|current|(?:(?:forventet|expected)\s+)?(?:(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember|january|february|march|may|june|july|october|december)\s+)?(?:19|20)\d{2})/i
const isPeriod = (line: string) => line.length < 70 && periodPattern.test(line)
const stripBullet = (line: string) => line.replace(/^[•·▪◦‣●–-]\s*/, '').trim()
const hasBullet = (line: string) => /^[•·▪◦‣●–-]\s*/.test(line)

const splitEntryHeader = (line: string) => {
  const parts = line.split(/\s+(?:[–—|]|-{1,2}|hos|at)\s+/i).map((part) => part.trim()).filter(Boolean)
  return { role: parts[0] ?? line, company: parts.slice(1).join(' – ') }
}

const extractPhone = (lines: string[]) => {
  for (const line of lines) {
    if (isPeriod(line)) continue
    const match = line.match(/(?:\+47|0047)?[\s-]*(?:\d[\s-]*){8}(?!\d)/)
    if (match) return match[0].trim()
  }
  return ''
}

const isGenericHeading = (line: string) =>
  line.length <= 45 && /\p{L}/u.test(line) && line === line.toLocaleUpperCase('nb-NO')

const toReference = (line: string, index: number): Reference => ({
  id: `import-ref-${index}`,
  text: stripBullet(line),
})

const isName = (line: string) =>
  !hasBullet(line) && !/[:@,|–—]/.test(line) && /^[A-ZÆØÅ][\p{L}'-]+(?:\s+[A-ZÆØÅ][\p{L}'-]+){1,3}$/u.test(line)

const parseSkills = (lines: string[]) => {
  const skills: string[] = []
  const skillGroups: SkillGroup[] = []
  let activeGroup: SkillGroup | null = null

  lines.forEach((rawLine, index) => {
    const value = stripBullet(rawLine).replace(/:$/, '').trim()
    if (!value) return
    const next = lines[index + 1] ?? ''
    const startsGroup = !hasBullet(rawLine) && (rawLine.trim().endsWith(':') || hasBullet(next))
    if (startsGroup) {
      activeGroup = { id: `import-skill-group-${index}`, title: value, items: [] }
      skillGroups.push(activeGroup)
      return
    }

    const items = value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean)
    if (hasBullet(rawLine) && activeGroup) activeGroup.items.push(...items)
    else {
      activeGroup = null
      skills.push(...items)
    }
  })

  return {
    skills: skills.slice(0, 30),
    skillGroups: skillGroups.filter((group) => group.title || group.items.length).slice(0, 12),
  }
}

const parseProjects = (lines: string[]): Project[] => {
  const projects: Project[] = []
  let active: Project | null = null
  lines.forEach((rawLine, index) => {
    const line = stripBullet(rawLine)
    if (!line) return
    const period = line.match(periodPattern)?.[0] ?? ''
    const heading = line.replace(periodPattern, '').replace(/^[,|·\s–—-]+|[,|·\s–—-]+$/g, '').trim()
    if (!active || period) {
      if (active) projects.push(active)
      active = {
        id: `import-project-${index}`,
        title: heading || line,
        period,
        subtitle: '',
        description: '',
        technologies: [],
      }
    } else if (!active.subtitle && !hasBullet(rawLine) && line.length < 70) {
      active.subtitle = line
    } else {
      active.description = `${active.description ? `${active.description} ` : ''}${line}`
    }
  })
  if (active) projects.push(active)
  return projects.filter((project) => project.title || project.description).slice(0, 8)
}

export function parseResume(text: string, fallback: CvData): CvData {
  const structured = fromStructuredImportText(text)
  if (structured) return normalizeCv(structured, fallback)

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
    projects: [],
    ignored: [],
  }
  let current = 'root'
  lines.forEach((line) => {
    const normalized = line.toLowerCase().replace(/[.:/]/g, '').replace(/\s+/g, ' ').trim()
    const key = sectionAliases[normalized]
    if (key) current = key
    else if (/^referanser? oppgis/i.test(line)) buckets.references.push(stripBullet(line))
    else if (isGenericHeading(line) && current !== 'skills') current = 'ignored'
    else buckets[current].push(line)
  })

  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? fallback.email
  const phone = extractPhone(lines) || fallback.phone
  const website = lines
    .filter((line) => !line.includes(email))
    .map((line) => line.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[\w-]+(?:\/\S*)?|[\w-]+\.(?:no|com|io|dev)(?:\/\S*)?)/i)?.[0])
    .find(Boolean) ?? fallback.website
  const labelledLocation = lines.find((line) => /^(?:adresse|bosted|sted|location|address)\s*:/i.test(line))?.replace(/^[^:]+:\s*/, '')
  const location = labelledLocation || fallback.location
  const root = buckets.root
    .map(stripBullet)
    .filter((line) => line && !line.includes(email) && !line.includes(phone) && !line.includes(website) && !/^(?:curriculum vitae|cv|resume|kontakt|contact)$/i.test(line))
  const nameIndex = lines.findIndex((line, index) => isName(line) && (isGenericHeading(lines[index + 1] ?? '') || /(?:leder|utvikler|student|rådgiver|ingeniør|manager|developer|engineer)/i.test(lines[index + 1] ?? '')))
  const name = nameIndex >= 0 ? stripBullet(lines[nameIndex]) : root.find(isName) ?? root[0] ?? fallback.name
  const titleAfterName = nameIndex >= 0 ? stripBullet(lines[nameIndex + 1] ?? '') : ''
  const title = titleAfterName || root.find((line) => line !== name && line !== location && line.length < 90 && !line.includes('@')) || fallback.title
  const inferredSummary: string[] = []
  if (nameIndex >= 0) {
    for (const line of lines.slice(nameIndex + 2)) {
      const normalized = line.toLowerCase().replace(/[.:/]/g, '').replace(/\s+/g, ' ').trim()
      if (sectionAliases[normalized] || isGenericHeading(line)) break
      if (!line.includes(email) && !line.includes(phone) && line !== location && !line.includes(website)) inferredSummary.push(stripBullet(line))
      if (inferredSummary.length >= 8) break
    }
  }

  const experience: Experience[] = []
  let activeExperience: Experience | null = null
  buckets.experience.forEach((rawLine, index, entries) => {
    const line = stripBullet(rawLine)
    if (!line) return
    const period = line.match(periodPattern)?.[0] ?? ''
    const heading = line.replace(periodPattern, '').replace(/^[,|·\s–—-]+|[,|·\s–—-]+$/g, '').trim()
    if (period) {
      if (heading) {
        if (activeExperience) experience.push(activeExperience)
        const parts = splitEntryHeader(heading)
        activeExperience = { id: `import-exp-${index}`, role: parts.role, company: parts.company, period, bullets: [] }
      } else if (activeExperience) {
        activeExperience.period = period
      }
      return
    }
    if (hasBullet(rawLine)) {
      if (activeExperience) activeExperience.bullets.push(line)
      return
    }
    const parts = splitEntryHeader(line)
    if (parts.company) {
      if (activeExperience) experience.push(activeExperience)
      activeExperience = { id: `import-exp-${index}`, role: parts.role, company: parts.company, period: '', bullets: [] }
    } else if (!activeExperience) {
      activeExperience = { id: `import-exp-${index}`, role: line, company: '', period: '', bullets: [] }
    } else if (!activeExperience.company && !activeExperience.period && !hasBullet(rawLine)) {
      activeExperience.company = line
    } else {
      const next = stripBullet(entries[index + 1] ?? '')
      if (activeExperience.period && !hasBullet(rawLine) && isPeriod(next)) {
        experience.push(activeExperience)
        activeExperience = { id: `import-exp-${index}`, role: line, company: '', period: '', bullets: [] }
      } else if (!hasBullet(rawLine) && activeExperience.bullets.length) {
        activeExperience.bullets[activeExperience.bullets.length - 1] += ` ${line}`
      } else {
        activeExperience.bullets.push(line)
      }
    }
  })
  if (activeExperience) experience.push(activeExperience)

  const education: Education[] = []
  let activeEducation: Education | null = null
  buckets.education.forEach((rawLine, index) => {
    const line = stripBullet(rawLine)
    if (!line) return
    const period = line.match(periodPattern)?.[0] ?? ''
    const heading = line.replace(periodPattern, '').replace(/^[,|·\s–—-]+|[,|·\s–—-]+$/g, '').trim()
    if (!activeEducation) {
      if (!period && (line.length > 70 || (line.endsWith('.') && line.length > 45))) return
      activeEducation = { id: `import-edu-${index}`, degree: heading || line, school: '', period }
    } else if (period) {
      if (heading && !activeEducation.school) activeEducation.school = heading
      activeEducation.period = period
      education.push(activeEducation)
      activeEducation = null
    } else if (!activeEducation.school) {
      activeEducation.school = line
    } else {
      education.push(activeEducation)
      activeEducation = { id: `import-edu-${index}`, degree: line, school: '', period: '' }
    }
  })
  if (activeEducation) education.push(activeEducation)

  const parsedSkills = parseSkills(buckets.skills)
  const projects = parseProjects(buckets.projects)

  return normalizeCv({
    ...fallback,
    name,
    title,
    email,
    phone,
    location,
    website,
    summary: buckets.summary.map(stripBullet).join(' ') || inferredSummary.join(' ') || fallback.summary,
    skills: buckets.skills.length ? parsedSkills.skills : fallback.skills,
    skillGroups: buckets.skills.length ? parsedSkills.skillGroups : fallback.skillGroups,
    languages: buckets.languages.length ? buckets.languages.map(stripBullet).slice(0, 6) : fallback.languages,
    references: buckets.references.length ? buckets.references.map(toReference).slice(0, 6) : fallback.references,
    experience: experience.length ? experience.slice(0, 8) : fallback.experience,
    education: education.length ? education.slice(0, 5) : fallback.education,
    projects: projects.length ? projects : fallback.projects,
  }, fallback)
}
