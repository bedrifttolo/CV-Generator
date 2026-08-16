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

export type CvLink = {
  id: string
  label: string
  url: string
}

export type Experience = {
  id: string
  role: string
  company: string
  period: string
  bullets: string[]
  companyLogo?: string
  links?: CvLink[]
}

export type SkillGroup = {
  id: string
  title: string
  items: string[]
}

export type Education = {
  id: string
  degree: string
  school: string
  period: string
  bullets: string[]
  schoolLogo?: string
}

export type Project = {
  id: string
  title: string
  subtitle?: string
  period?: string
  description?: string
  bullets: string[]
  technologies?: string[]
  url?: string
  githubUrl?: string
  image?: string
  links?: CvLink[]
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
  skillGroups: SkillGroup[]
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

export type JobSource = 'finn' | 'linkedin' | 'arbeidsplassen' | 'company' | 'other'

export type JobDeadlineType = 'date' | 'ongoing' | 'asap' | 'unknown'

export type ApplicationStatus =
  | 'saved'
  | 'planning'
  | 'applied'
  | 'interview'
  | 'rejected'
  | 'offer'
  | 'withdrawn'

export type JobContact = {
  name?: string
  role?: string
  phone?: string
  email?: string
}

export type JobAnalysis = {
  coreRequirements: string[]
  importantSkills: string[]
  technologies: string[]
  softSkills: string[]
  responsibilities: string[]
  keywords: string[]
  seniority?: string
  recommendedFocus: string[]
}

export type JobPosting = {
  id: string
  title: string
  company: string
  location?: string
  deadline?: string
  deadlineType: JobDeadlineType
  publishedAt?: string
  employmentType?: string
  positionPercentage?: string
  source: JobSource
  sourceUrl: string
  description?: string
  originalText?: string
  responsibilities: string[]
  requiredQualifications: string[]
  preferredQualifications: string[]
  skills: string[]
  technologies: string[]
  benefits: string[]
  contactPersons: JobContact[]
  salary?: string
  remotePolicy?: string
  jobAnalysis: JobAnalysis
  status: ApplicationStatus
  appliedAt?: string
  createdAt: string
  updatedAt: string
}

export type CoverLetter = {
  id: string
  jobId?: string
  company?: string
  position?: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CandidateMatchItem = {
  requirement: string
  evidence: string
}

export type CandidateMatch = {
  strongMatches: CandidateMatchItem[]
  partialMatches: CandidateMatchItem[]
  missingRequirements: string[]
  experiencesToHighlight: string[]
  projectsToHighlight: string[]
  keywordsToUse: string[]
  advice: string[]
  suggestedOpening: string
  letter: string
}
