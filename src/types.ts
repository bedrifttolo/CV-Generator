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
}

export type Education = {
  id: string
  degree: string
  school: string
  period: string
}

export type CustomSection = {
  id: string
  title: string
  items: string[]
  placement: 'main' | 'sidebar'
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
  languages: string[]
  references: string[]
  customSections: CustomSection[]
  hiddenSections: string[]
  hiddenContactFields: string[]
  sidebarOrder: string[]
  photo: string
  sectionOrder: string[]
}

export type CoachFinding = {
  level: 'sterk' | 'forbedre' | 'viktig'
  title: string
  detail: string
}

export type Industry = 'teknologi' | 'helse' | 'bygg' | 'økonomi' | 'service' | 'offentlig'
