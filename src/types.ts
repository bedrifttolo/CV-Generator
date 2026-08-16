export type TemplateId =
  | 'nordlys'
  | 'fjord'
  | 'klassisk'
  | 'signal'
  | 'ats'
  | 'europass'
  | 'harvard'
  | 'akademisk'

export type ThemeId = 'skog' | 'hav' | 'burgunder' | 'sand' | 'mono'

export type Experience = {
  id: string
  role: string
  company: string
  period: string
  bullets: string[]
  companyLogo?: string
}

export type Education = {
  id: string
  degree: string
  school: string
  period: string
}

export type Project = {
  id: string
  title: string
  subtitle?: string
  period?: string
  description?: string
  technologies?: string[]
  url?: string
  githubUrl?: string
  image?: string
}

export type Reference = {
  id: string
  name?: string
  role?: string
  company?: string
  phone?: string
  email?: string
  text?: string
}

export type ReferencePlacement = 'hidden' | 'sidebar' | 'main'

export type CustomSection = {
  id: string
  title: string
  items: string[]
  placement: 'main' | 'sidebar'
}

export type TypeScaleId = 'kompakt' | 'standard' | 'stor'
export type SpaceScaleId = 'kompakt' | 'standard' | 'luftig'

export type CvAppearance = {
  typeScale: TypeScaleId
  spaceScale: SpaceScaleId
  margin: number
}

export type CvData = {
  name: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  summary: string
  skills: string[]
  experience: Experience[]
  education: Education[]
  projects: Project[]
  languages: string[]
  references: Reference[]
  referencePlacement: ReferencePlacement
  customSections: CustomSection[]
  hiddenSections: string[]
  hiddenContactFields: string[]
  sidebarOrder: string[]
  photo: string
  sectionOrder: string[]
  appearance: CvAppearance
}

export type CoachFinding = {
  level: 'sterk' | 'forbedre' | 'viktig'
  title: string
  detail: string
}

export type Industry = 'teknologi' | 'helse' | 'bygg' | 'økonomi' | 'service' | 'offentlig'
