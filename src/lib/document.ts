import { defaultAppearance, marginRange, spaceScales, typeScales } from '../data'
import type { CvAppearance, CvData, Project, Reference, ReferencePlacement, SkillGroup } from '../types'

let counter = 0
export const newId = (prefix: string) => {
  counter += 1
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${counter}`
  return `${prefix}-${random}`
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const storedText = (value: unknown, fallback: string) => (typeof value === 'string' ? value.trim() : fallback)
const textList = (value: unknown, fallback: string[] = []) =>
  Array.isArray(value) ? value.map(text).filter(Boolean) : fallback

export function normalizeSkillGroups(value: unknown): SkillGroup[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item): SkillGroup | null => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Partial<SkillGroup>
      const title = text(entry.title)
      const items = textList(entry.items)
      if (!title && !items.length) return null
      return { id: text(entry.id) || newId('skill-group'), title, items }
    })
    .filter((item): item is SkillGroup => item !== null)
}

/** Referanser var tidligere en liste med tekstlinjer. Begge formene skal fortsatt kunne åpnes. */
export function normalizeReferences(value: unknown): Reference[] | null {
  if (!Array.isArray(value)) return null
  return value
    .map((item): Reference | null => {
      if (typeof item === 'string') {
        const line = item.trim()
        return line ? { id: newId('ref'), text: line } : null
      }
      if (!item || typeof item !== 'object') return null
      const entry = item as Partial<Reference>
      const reference: Reference = {
        id: text(entry.id) || newId('ref'),
        name: text(entry.name),
        role: text(entry.role),
        company: text(entry.company),
        phone: text(entry.phone),
        email: text(entry.email),
        text: text(entry.text),
      }
      return hasReferenceContent(reference) ? reference : null
    })
    .filter((item): item is Reference => item !== null)
}

export const hasReferenceContent = (reference: Reference) =>
  Boolean(reference.name || reference.role || reference.company || reference.phone || reference.email || reference.text)

export function normalizeProjects(value: unknown): Project[] | null {
  if (!Array.isArray(value)) return null
  return value
    .map((item): Project | null => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Partial<Project>
      return {
        id: text(entry.id) || newId('prj'),
        title: text(entry.title),
        subtitle: text(entry.subtitle),
        period: text(entry.period),
        description: text(entry.description),
        technologies: Array.isArray(entry.technologies) ? entry.technologies.map(text).filter(Boolean) : [],
        url: text(entry.url),
        githubUrl: text(entry.githubUrl),
        image: text(entry.image),
      }
    })
    .filter((item): item is Project => item !== null && hasProjectContent(item))
}

export const hasProjectContent = (project: Project) =>
  Boolean(
    project.title || project.subtitle || project.description || project.period || project.technologies?.length ||
    project.url || project.githubUrl || project.image,
  )

function normalizeAppearance(value: unknown): CvAppearance {
  const entry = (value ?? {}) as Partial<CvAppearance>
  const margin = Number(entry.margin)
  return {
    typeScale: entry.typeScale && entry.typeScale in typeScales ? entry.typeScale : defaultAppearance.typeScale,
    spaceScale: entry.spaceScale && entry.spaceScale in spaceScales ? entry.spaceScale : defaultAppearance.spaceScale,
    margin: Number.isFinite(margin) ? Math.min(marginRange.max, Math.max(marginRange.min, margin)) : defaultAppearance.margin,
  }
}

const insertAfter = (order: string[], id: string, anchor: string) => {
  if (order.includes(id)) return order
  const next = [...order]
  const index = next.indexOf(anchor)
  if (index === -1) next.push(id)
  else next.splice(index + 1, 0, id)
  return next
}

/**
 * Referanser skal aldri ligge i både hovedfelt og sidefelt. Plasseringen bestemmer
 * hvilken rekkefølgeliste seksjonen hører hjemme i.
 */
export function applyReferencePlacement(cv: CvData, placement: ReferencePlacement): CvData {
  const inMain = cv.sectionOrder.includes('references')
  const inSidebar = cv.sidebarOrder.includes('references')
  const strippedMain = cv.sectionOrder.filter((id) => id !== 'references')
  const strippedSidebar = cv.sidebarOrder.filter((id) => id !== 'references')
  return {
    ...cv,
    referencePlacement: placement,
    // Standard i hovedfeltet er nederst, men en eksisterende plassering beholdes.
    sectionOrder: placement === 'main' ? (inMain ? cv.sectionOrder : [...strippedMain, 'references']) : strippedMain,
    sidebarOrder: placement === 'sidebar' ? (inSidebar ? cv.sidebarOrder : [...strippedSidebar, 'references']) : strippedSidebar,
    hiddenSections: placement === 'hidden'
      ? (cv.hiddenSections.includes('references') ? cv.hiddenSections : [...cv.hiddenSections, 'references'])
      : cv.hiddenSections.filter((id) => id !== 'references'),
  }
}

/** Slår sammen lagret CV med gjeldende datamodell slik at eldre dokumenter fortsatt åpnes. */
export function normalizeCv(parsed: Partial<CvData>, fallback: CvData): CvData {
  const storedProjects = parsed.projects === undefined ? [] : normalizeProjects(parsed.projects) ?? []
  const storedReferences = parsed.references === undefined ? [] : normalizeReferences(parsed.references) ?? []
  const storedExperience = Array.isArray(parsed.experience) ? parsed.experience : fallback.experience
  const storedEducation = Array.isArray(parsed.education) ? parsed.education : fallback.education
  const storedCustomSections = Array.isArray(parsed.customSections) ? parsed.customSections : fallback.customSections
  const storedSidebarOrder = Array.isArray(parsed.sidebarOrder) ? parsed.sidebarOrder : fallback.sidebarOrder
  const storedSectionOrder = Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder : fallback.sectionOrder
  const merged: CvData = {
    ...fallback,
    ...parsed,
    name: storedText(parsed.name, fallback.name),
    title: storedText(parsed.title, fallback.title),
    email: storedText(parsed.email, fallback.email),
    phone: storedText(parsed.phone, fallback.phone),
    location: storedText(parsed.location, fallback.location),
    website: storedText(parsed.website, fallback.website),
    summary: storedText(parsed.summary, fallback.summary),
    photo: storedText(parsed.photo, fallback.photo),
    skills: textList(parsed.skills, fallback.skills),
    skillGroups: normalizeSkillGroups(parsed.skillGroups),
    experience: storedExperience
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: text(entry.id) || newId('exp'),
        role: text(entry.role),
        company: text(entry.company),
        period: text(entry.period),
        bullets: textList(entry.bullets),
        companyLogo: text(entry.companyLogo),
      })),
    education: storedEducation
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: text(entry.id) || newId('edu'),
        degree: text(entry.degree),
        school: text(entry.school),
        period: text(entry.period),
      })),
    // Nye eksempelrader skal ikke dukke opp i et dokument som ble lagret før
    // prosjekter og strukturerte referanser fantes.
    projects: storedProjects,
    references: storedReferences,
    languages: textList(parsed.languages, fallback.languages),
    customSections: storedCustomSections
      .filter((section) => section && typeof section === 'object')
      .map((section) => ({
        id: text(section.id) || `custom-${newId('section')}`,
        title: text(section.title) || 'Egen seksjon',
        items: textList(section.items),
        placement: section.placement === 'sidebar' ? 'sidebar' : 'main',
      })),
    hiddenSections: textList(parsed.hiddenSections, fallback.hiddenSections),
    hiddenContactFields: textList(parsed.hiddenContactFields, fallback.hiddenContactFields),
    sidebarOrder: textList(storedSidebarOrder).map((id) => (id === 'skills' ? 'side-skills' : id)),
    sectionOrder: insertAfter(textList(storedSectionOrder), 'projects', 'education'),
    appearance: normalizeAppearance(parsed.appearance),
  }

  const storedPlacement = parsed.referencePlacement
  const placement: ReferencePlacement = storedPlacement && ['hidden', 'sidebar', 'main'].includes(storedPlacement)
    ? storedPlacement
    : (merged.hiddenSections.includes('references')
      ? 'hidden'
      : merged.sectionOrder.includes('references')
        ? 'main'
        : merged.sidebarOrder.includes('references')
          ? 'sidebar'
          : 'hidden')

  return applyReferencePlacement(merged, placement)
}
