export type TemplateId = 'nordlys' | 'fjord' | 'klassisk' | 'signal'

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
  photo: string
  sectionOrder: Array<'summary' | 'experience' | 'education' | 'skills'>
}

export type CoachFinding = {
  level: 'sterk' | 'forbedre' | 'viktig'
  title: string
  detail: string
}

export type Industry = 'teknologi' | 'helse' | 'bygg' | 'økonomi' | 'service' | 'offentlig'
