import type {
  ApplicationStatus,
  CandidateMatch,
  CoverLetter,
  CvData,
  JobAnalysis,
  JobDeadlineType,
  JobPosting,
  JobSource,
} from '../types'
import { newId } from './document'

export const JOBS_STORAGE_KEY = 'cvklar-jobs'
export const LETTERS_STORAGE_KEY = 'cvklar-cover-letters'

export const statusLabels: Record<ApplicationStatus, string> = {
  saved: 'Lagret',
  planning: 'Planlegger å søke',
  applied: 'Søkt',
  interview: 'Intervju',
  rejected: 'Avslag',
  offer: 'Tilbud',
  withdrawn: 'Trukket',
}

export const statusOptions = Object.entries(statusLabels) as Array<[ApplicationStatus, string]>

const emptyAnalysis = (): JobAnalysis => ({
  coreRequirements: [],
  importantSkills: [],
  technologies: [],
  softSkills: [],
  responsibilities: [],
  keywords: [],
  recommendedFocus: [],
})

const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const stringList = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map(stringValue).filter(Boolean))].slice(0, 40)
  : []

const isDeadlineType = (value: unknown): value is JobDeadlineType =>
  ['date', 'ongoing', 'asap', 'unknown'].includes(String(value))

const isStatus = (value: unknown): value is ApplicationStatus =>
  Object.hasOwn(statusLabels, String(value))

export function sourceFromUrl(rawUrl: string): JobSource {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
    if (host === 'finn.no' || host.endsWith('.finn.no')) return 'finn'
    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return 'linkedin'
    if (host === 'arbeidsplassen.nav.no' || host.endsWith('.arbeidsplassen.nav.no')) return 'arbeidsplassen'
    return 'company'
  } catch {
    return 'other'
  }
}

export function createBlankJob(seed: Partial<JobPosting> = {}): JobPosting {
  const now = new Date().toISOString()
  return normalizeJob({
    id: newId('job'),
    title: '',
    company: '',
    deadlineType: 'unknown',
    source: seed.sourceUrl ? sourceFromUrl(seed.sourceUrl) : 'other',
    sourceUrl: '',
    status: 'saved',
    createdAt: now,
    updatedAt: now,
    ...seed,
  })
}

export function normalizeJob(value: unknown): JobPosting {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const now = new Date().toISOString()
  const sourceUrl = stringValue(input.sourceUrl)
  const analysisInput = input.jobAnalysis && typeof input.jobAnalysis === 'object'
    ? input.jobAnalysis as Record<string, unknown>
    : {}
  const analysis: JobAnalysis = {
    ...emptyAnalysis(),
    coreRequirements: stringList(analysisInput.coreRequirements),
    importantSkills: stringList(analysisInput.importantSkills),
    technologies: stringList(analysisInput.technologies),
    softSkills: stringList(analysisInput.softSkills),
    responsibilities: stringList(analysisInput.responsibilities),
    keywords: stringList(analysisInput.keywords),
    seniority: stringValue(analysisInput.seniority) || undefined,
    recommendedFocus: stringList(analysisInput.recommendedFocus),
  }
  const contactPersons = Array.isArray(input.contactPersons)
    ? input.contactPersons.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const contact = item as Record<string, unknown>
        return [{
          name: stringValue(contact.name) || undefined,
          role: stringValue(contact.role) || undefined,
          phone: stringValue(contact.phone) || undefined,
          email: stringValue(contact.email) || undefined,
        }]
      }).slice(0, 10)
    : []
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(stringValue(input.deadline)) ? stringValue(input.deadline) : undefined

  return {
    id: stringValue(input.id) || newId('job'),
    title: stringValue(input.title),
    company: stringValue(input.company),
    location: stringValue(input.location) || undefined,
    deadline,
    deadlineType: isDeadlineType(input.deadlineType) ? input.deadlineType : deadline ? 'date' : 'unknown',
    publishedAt: stringValue(input.publishedAt) || undefined,
    employmentType: stringValue(input.employmentType) || undefined,
    positionPercentage: stringValue(input.positionPercentage) || undefined,
    source: ['finn', 'linkedin', 'arbeidsplassen', 'company', 'other'].includes(String(input.source))
      ? input.source as JobSource
      : sourceFromUrl(sourceUrl),
    sourceUrl,
    description: stringValue(input.description) || undefined,
    originalText: stringValue(input.originalText) || undefined,
    responsibilities: stringList(input.responsibilities),
    requiredQualifications: stringList(input.requiredQualifications),
    preferredQualifications: stringList(input.preferredQualifications),
    skills: stringList(input.skills),
    technologies: stringList(input.technologies),
    benefits: stringList(input.benefits),
    contactPersons,
    salary: stringValue(input.salary) || undefined,
    remotePolicy: stringValue(input.remotePolicy) || undefined,
    jobAnalysis: analysis,
    status: isStatus(input.status) ? input.status : 'saved',
    appliedAt: /^\d{4}-\d{2}-\d{2}$/.test(stringValue(input.appliedAt)) ? stringValue(input.appliedAt) : undefined,
    createdAt: stringValue(input.createdAt) || now,
    updatedAt: stringValue(input.updatedAt) || now,
  }
}

export function loadJobs(): JobPosting[] {
  try {
    const value = JSON.parse(localStorage.getItem(JOBS_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.map(normalizeJob) : []
  } catch {
    return []
  }
}

export function loadCoverLetters(): CoverLetter[] {
  try {
    const value = JSON.parse(localStorage.getItem(LETTERS_STORAGE_KEY) || '[]')
    if (!Array.isArray(value)) return []
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const item = entry as Record<string, unknown>
      const content = stringValue(item.content)
      if (!content) return []
      const now = new Date().toISOString()
      return [{
        id: stringValue(item.id) || newId('letter'),
        jobId: stringValue(item.jobId) || undefined,
        company: stringValue(item.company) || undefined,
        position: stringValue(item.position) || undefined,
        content,
        createdAt: stringValue(item.createdAt) || now,
        updatedAt: stringValue(item.updatedAt) || now,
      }]
    })
  } catch {
    return []
  }
}

export function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseCalendarDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null
}

export function formatCalendarDate(value?: string, includeYear = true) {
  const date = parseCalendarDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(date)
}

export function deadlineLabel(job: Pick<JobPosting, 'deadline' | 'deadlineType'>) {
  if (job.deadlineType === 'ongoing') return { date: 'Fortløpende', relative: 'Åpen frist', tone: 'neutral' as const }
  if (job.deadlineType === 'asap') return { date: 'Snarest', relative: 'Søk så snart du kan', tone: 'urgent' as const }
  const deadline = parseCalendarDate(job.deadline)
  if (!deadline) return { date: 'Frist ikke oppgitt', relative: 'Kontroller annonsen', tone: 'neutral' as const }
  const today = parseCalendarDate(localDateValue())!
  const days = Math.round((deadline.getTime() - today.getTime()) / 86_400_000)
  const relative = days < 0 ? 'Frist utløpt' : days === 0 ? 'Frist i dag' : days === 1 ? '1 dag igjen' : `${days} dager igjen`
  return {
    date: formatCalendarDate(job.deadline, deadline.getFullYear() !== today.getFullYear()),
    relative,
    tone: days < 0 ? 'expired' as const : days <= 3 ? 'urgent' as const : 'normal' as const,
  }
}

const stopWords = new Set([
  'alle', 'andre', 'arbeid', 'arbeide', 'at', 'av', 'den', 'det', 'dette', 'din', 'dine', 'du', 'eller', 'en',
  'er', 'etter', 'for', 'fra', 'har', 'hos', 'ikke', 'kan', 'med', 'mot', 'og', 'også', 'oss', 'på', 'seg', 'skal',
  'som', 'til', 'ved', 'vi', 'vil', 'vår', 'være', 'ønsker', 'søker', 'stilling', 'stillingen', 'jobben',
  'gode', 'godt', 'bygge', 'tjenester', 'gjennom', 'blant',
])

export function extractKeywords(text: string, limit = 14) {
  const words = (text.toLowerCase().match(/[a-zæøå0-9+#.-]{3,}/g) || []).map((word) => word.replace(/[.,;-]+$/g, '')).filter(Boolean)
  const counts = new Map<string, number>()
  words.filter((word) => !stopWords.has(word)).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, limit)
}

export function jobFromText(text: string, seed: Partial<JobPosting> = {}) {
  const cleaned = text.replace(/\r/g, '').trim().slice(0, 40_000)
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean)
  const lower = cleaned.toLowerCase()
  let deadlineType: JobDeadlineType = /fortløpende|løpende vurdering/.test(lower) ? 'ongoing' : /snarest|så snart som mulig/.test(lower) ? 'asap' : 'unknown'
  let deadline: string | undefined
  const dateMatch = cleaned.match(/(?:frist|søknadsfrist)[^\d]{0,18}(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/i)
  if (dateMatch) {
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]
    deadline = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
    deadlineType = 'date'
  }
  const keywords = extractKeywords(cleaned)
  return createBlankJob({
    ...seed,
    title: seed.title || lines[0]?.slice(0, 120) || '',
    description: seed.description || lines.slice(0, 5).join(' ').slice(0, 700),
    originalText: cleaned,
    deadline: seed.deadline || deadline,
    deadlineType: seed.deadlineType && seed.deadlineType !== 'unknown' ? seed.deadlineType : deadlineType,
    skills: seed.skills?.length ? seed.skills : keywords.slice(0, 8),
    jobAnalysis: {
      ...emptyAnalysis(),
      importantSkills: keywords.slice(0, 8),
      keywords,
    },
  })
}

export function sanitizedCandidate(cv: CvData) {
  return {
    profile: cv.summary,
    currentTitle: cv.title,
    experience: cv.experience.map(({ role, company, period, bullets }) => ({ role, company, period, bullets })),
    education: cv.education.map(({ degree, school, period }) => ({ degree, school, period })),
    skills: [...cv.skills, ...cv.skillGroups.flatMap((group) => group.items)],
    projects: cv.projects.map(({ title, subtitle, period, description, technologies }) => ({ title, subtitle, period, description, technologies })),
    languages: cv.languages,
  }
}

export function sanitizedJob(job: JobPosting) {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    originalText: job.originalText,
    responsibilities: job.responsibilities,
    requiredQualifications: job.requiredQualifications,
    preferredQualifications: job.preferredQualifications,
    skills: job.skills,
    technologies: job.technologies,
    jobAnalysis: job.jobAnalysis,
  }
}

export function localCandidateMatch(cv: CvData, job: Pick<JobPosting, 'originalText' | 'description' | 'requiredQualifications' | 'skills' | 'technologies' | 'jobAnalysis'>): CandidateMatch {
  const candidateText = JSON.stringify(sanitizedCandidate(cv)).toLowerCase()
  const requirements = [...new Set([
    ...job.requiredQualifications,
    ...job.technologies,
    ...job.skills,
    ...job.jobAnalysis.coreRequirements,
    ...job.jobAnalysis.keywords,
    ...extractKeywords(`${job.description || ''} ${job.originalText || ''}`, 12),
  ])].filter(Boolean).slice(0, 20)
  const matches = requirements.filter((item) => candidateText.includes(item.toLowerCase()))
  const missing = requirements.filter((item) => !candidateText.includes(item.toLowerCase()))
  const scoredExperience = cv.experience.map((entry) => ({
    label: `${entry.role}${entry.company ? ` hos ${entry.company}` : ''}`,
    score: matches.filter((term) => `${entry.role} ${entry.company} ${entry.bullets.join(' ')}`.toLowerCase().includes(term.toLowerCase())).length,
  })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score)
  const scoredProjects = cv.projects.map((project) => ({
    label: project.title,
    score: matches.filter((term) => `${project.title} ${project.description || ''} ${(project.technologies || []).join(' ')}`.toLowerCase().includes(term.toLowerCase())).length,
  })).filter((project) => project.score > 0).sort((a, b) => b.score - a.score)
  const strongMatches = matches.slice(0, 8).map((requirement) => ({ requirement, evidence: `Begrepet er dokumentert i CV-en.` }))
  return {
    strongMatches,
    partialMatches: [],
    missingRequirements: missing.slice(0, 8),
    experiencesToHighlight: scoredExperience.slice(0, 4).map((item) => item.label),
    projectsToHighlight: scoredProjects.slice(0, 4).map((item) => item.label),
    keywordsToUse: matches.slice(0, 10),
    advice: [
      ...scoredExperience.slice(0, 2).map((item) => `Knytt ${item.label} til en konkret oppgave i annonsen.`),
      ...scoredProjects.slice(0, 2).map((item) => `Bruk ${item.label} som et kort, etterprøvbart eksempel.`),
      ...(missing.length ? [`Ikke påstå erfaring med ${missing.slice(0, 3).join(', ')} uten at du kan dokumentere det.`] : []),
    ].slice(0, 6),
    suggestedOpening: '',
    letter: '',
  }
}
