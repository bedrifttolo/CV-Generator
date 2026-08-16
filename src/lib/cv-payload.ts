import type { CvData } from '../types'

const PDF_PAYLOAD_PREFIX = 'CVKLAR_DATA_V1:'
const IMPORT_TEXT_PREFIX = 'CVKLAR_IMPORT_V1:'
const MAX_EMBEDDED_JSON_LENGTH = 900_000

const toBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

const fromBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new TextDecoder().decode(bytes)
}

const withoutLargeImages = (data: CvData): CvData => ({
  ...data,
  photo: data.photo.startsWith('data:') ? '' : data.photo,
  experience: data.experience.map((entry) => ({ ...entry, companyLogo: entry.companyLogo?.startsWith('data:') ? '' : entry.companyLogo })),
  projects: data.projects.map((project) => ({ ...project, image: project.image?.startsWith('data:') ? '' : project.image })),
})

/** Skjulte felt skal ikke følge med som usynlige data når PDF-en deles. */
const visiblePdfData = (data: CvData): CvData => {
  const hidden = new Set(data.hiddenSections)
  const hiddenContact = new Set(data.hiddenContactFields)
  const skillsVisible = !hidden.has('skills') || !hidden.has('side-skills')
  const referencesVisible = data.referencePlacement !== 'hidden' && !hidden.has('references')
  return {
    ...data,
    email: hiddenContact.has('email') ? '' : data.email,
    phone: hiddenContact.has('phone') ? '' : data.phone,
    location: hiddenContact.has('location') ? '' : data.location,
    website: hiddenContact.has('website') ? '' : data.website,
    summary: hidden.has('summary') ? '' : data.summary,
    experience: hidden.has('experience') ? [] : data.experience,
    education: hidden.has('education') ? [] : data.education,
    projects: hidden.has('projects') ? [] : data.projects,
    skills: skillsVisible ? data.skills : [],
    skillGroups: skillsVisible ? data.skillGroups : [],
    languages: hidden.has('languages') ? [] : data.languages,
    references: referencesVisible ? data.references : [],
    customSections: data.customSections.filter((section) => !hidden.has(section.id)),
  }
}

/** Legger den synlige CV-modellen i PDF-metadata. Store lokale bilder utelates ved behov. */
export function encodeCvPdfPayload(data: CvData) {
  const visibleData = visiblePdfData(data)
  let json = JSON.stringify({ version: 1, data: visibleData })
  if (json.length > MAX_EMBEDDED_JSON_LENGTH) json = JSON.stringify({ version: 1, data: withoutLargeImages(visibleData) })
  return `${PDF_PAYLOAD_PREFIX}${toBase64(json)}`
}

export function decodeCvPdfPayload(value: unknown): Partial<CvData> | null {
  if (typeof value !== 'string' || !value.startsWith(PDF_PAYLOAD_PREFIX)) return null
  try {
    const parsed = JSON.parse(fromBase64(value.slice(PDF_PAYLOAD_PREFIX.length))) as { version?: unknown; data?: unknown }
    return parsed.version === 1 && parsed.data && typeof parsed.data === 'object' ? parsed.data as Partial<CvData> : null
  } catch {
    return null
  }
}

export const toStructuredImportText = (data: Partial<CvData>) => `${IMPORT_TEXT_PREFIX}${JSON.stringify(data)}`

export function fromStructuredImportText(value: string): Partial<CvData> | null {
  if (!value.startsWith(IMPORT_TEXT_PREFIX)) return null
  try {
    const parsed = JSON.parse(value.slice(IMPORT_TEXT_PREFIX.length))
    return parsed && typeof parsed === 'object' ? parsed as Partial<CvData> : null
  } catch {
    return null
  }
}
