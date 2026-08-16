import type { CSSProperties } from 'react'
import profileUrl from '../assets/avatar-placeholder.svg'
import type { CvAppearance, CvData, Industry, SpaceScaleId, ThemeId, TypeScaleId } from './types'

export const typeScales: Record<TypeScaleId, {
  label: string
  note: string
  name: number
  title: number
  heading: number
  body: number
  secondary: number
  meta: number
}> = {
  kompakt: { label: 'Kompakt', note: 'Body 10 pt · Overskrift 13 pt · Navn 20 pt', name: 20, title: 11, heading: 13, body: 10, secondary: 9.5, meta: 9 },
  standard: { label: 'Standard', note: 'Body 10.5 pt · Overskrift 14 pt · Navn 22 pt', name: 22, title: 11.5, heading: 14, body: 10.5, secondary: 10, meta: 9.5 },
  stor: { label: 'Stor', note: 'Body 11.5 pt · Overskrift 15.5 pt · Navn 24 pt', name: 24, title: 12, heading: 15.5, body: 11.5, secondary: 11, meta: 10 },
}

export const spaceScales: Record<SpaceScaleId, { label: string; note: string; factor: number; lineHeight: number }> = {
  kompakt: { label: 'Kompakt', note: 'Mest innhold per side', factor: 0.8, lineHeight: 1.05 },
  standard: { label: 'Standard', note: 'Linjeavstand 1.1', factor: 1, lineHeight: 1.1 },
  luftig: { label: 'Luftig', note: 'Mer luft mellom seksjoner', factor: 1.3, lineHeight: 1.25 },
}

export const defaultAppearance: CvAppearance = { typeScale: 'standard', spaceScale: 'standard', margin: 20 }
export const marginRange = { min: 15, max: 25 }

export function cvStyleVars(appearance: CvAppearance | undefined): CSSProperties {
  const type = typeScales[appearance?.typeScale ?? 'standard'] ?? typeScales.standard
  const space = spaceScales[appearance?.spaceScale ?? 'standard'] ?? spaceScales.standard
  const margin = Math.min(marginRange.max, Math.max(marginRange.min, appearance?.margin ?? defaultAppearance.margin))
  const step = (value: number) => `${Number((value * space.factor).toFixed(2))}pt`
  return {
    '--cv-font-name': `${type.name}pt`,
    '--cv-font-title': `${type.title}pt`,
    '--cv-font-heading': `${type.heading}pt`,
    '--cv-font-body': `${type.body}pt`,
    '--cv-font-secondary': `${type.secondary}pt`,
    '--cv-font-meta': `${type.meta}pt`,
    '--cv-line-height': String(space.lineHeight),
    '--cv-space-xs': step(3),
    '--cv-space-sm': step(6),
    '--cv-space-md': step(10),
    '--cv-space-lg': step(14),
    '--cv-space-xl': step(18),
    '--cv-margin': `${margin}mm`,
    '--cv-margin-tight': `${Number((margin * 0.68).toFixed(2))}mm`,
    '--cv-margin-sidebar': `${Number(Math.min(16, Math.max(11, margin * 0.72)).toFixed(2))}mm`,
  } as CSSProperties
}

export const defaultCv: CvData = {
  name: 'Kari Nordmann',
  title: 'Prosjektkoordinator · Digitale tjenester',
  email: 'kari.nordmann@example.no',
  phone: '+47 900 00 000',
  location: 'Oslo, Norge',
  website: 'linkedin.com/in/kari-nordmann',
  summary:
    'Strukturert prosjektkoordinator med erfaring fra digitale leveranser og kundedialog. Trives med å samle mennesker, holde fremdrift og gjøre komplekse oppgaver enkle å forstå.',
  skills: [
    'Prosjektkoordinering',
    'Digital samhandling',
    'Analyse og rapportering',
    'Kundebehov',
    'Microsoft 365',
    'Norsk og engelsk',
  ],
  skillGroups: [],
  experience: [
    {
      id: 'exp-1',
      role: 'Prosjektkoordinator',
      company: 'Eksempel Digital AS',
      period: '2023 til nå',
      bullets: [
        'Koordinerer tverrfaglige leveranser fra oppstart til ferdig overlevering.',
        'Forbedret rapporteringsrutinen og reduserte ukentlig administrasjonstid med 20 prosent.',
      ],
      links: [],
    },
    {
      id: 'exp-2',
      role: 'Kunderådgiver',
      company: 'Sentrum Kundeservice AS',
      period: '2020 til 2023',
      bullets: [
        'Fulgt opp kunder, avklart behov og samarbeidet med fagmiljøer om gode løsninger.',
      ],
      links: [],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Bachelor i organisasjon og ledelse',
      school: 'Norsk eksempeluniversitet',
      period: '2017 til 2020',
      bullets: ['Fordypning i prosjektarbeid, organisasjonsutvikling og digital samhandling.'],
      schoolLogo: '',
    },
  ],
  projects: [
    {
      id: 'prj-1',
      title: 'Digital onboarding',
      subtitle: 'Prosjektleder',
      period: '2024',
      description: 'Digitaliserte en manuell velkomstprosess for nye kunder.',
      bullets: [
        'Ledet et tverrfaglig team fra innsikt til lansering.',
        'Kuttet behandlingstiden fra fem dager til én.',
      ],
      technologies: ['Prosjektledelse', 'Tjenestedesign', 'Power BI'],
      url: '',
      githubUrl: '',
      links: [],
    },
  ],
  languages: ['Norsk, morsmål', 'Engelsk, godt nivå'],
  references: [{ id: 'ref-1', text: 'Oppgis på forespørsel' }],
  referencePlacement: 'sidebar',
  customSections: [],
  hiddenSections: [],
  hiddenContactFields: [],
  sidebarOrder: ['contact', 'side-skills', 'languages', 'references'],
  photo: profileUrl,
  sectionOrder: ['summary', 'experience', 'education', 'projects', 'skills'],
  appearance: { ...defaultAppearance },
}

export const blankCv: CvData = {
  name: 'Navnet ditt',
  title: 'Ønsket stilling eller fagområde',
  email: 'deg@epost.no',
  phone: '+47 000 00 000',
  location: 'Sted, Norge',
  website: 'linkedin.com/in/dittnavn',
  summary:
    'Skriv 3 til 5 korte linjer om hvem du er faglig, hva du kan bidra med og hvilken type rolle du ønsker.',
  skills: ['Kompetanse 1', 'Kompetanse 2', 'Kompetanse 3'],
  skillGroups: [],
  experience: [
    {
      id: 'blank-exp-1',
      role: 'Stillingstittel',
      company: 'Arbeidsgiver',
      period: 'År til år',
      bullets: ['Beskriv et konkret ansvar, en oppgave eller et målbart resultat.'],
      links: [],
    },
  ],
  education: [
    {
      id: 'blank-edu-1',
      degree: 'Utdanning eller grad',
      school: 'Skole eller studiested',
      period: 'År til år',
      bullets: ['Nevn en relevant fordypning, oppgave eller et oppnådd resultat.'],
      schoolLogo: '',
    },
  ],
  projects: [
    {
      id: 'blank-prj-1',
      title: 'Prosjektnavn',
      subtitle: 'Rollen din i prosjektet',
      period: 'År',
      description: 'Beskriv kort hva prosjektet gikk ut på, hva du gjorde og hva resultatet ble.',
      bullets: ['Beskriv ditt viktigste bidrag eller et konkret resultat.'],
      technologies: ['Verktøy eller metode'],
      url: '',
      githubUrl: '',
      links: [],
    },
  ],
  languages: ['Norsk, nivå', 'Engelsk, nivå'],
  references: [{ id: 'blank-ref-1', text: 'Oppgis på forespørsel' }],
  referencePlacement: 'sidebar',
  customSections: [],
  hiddenSections: [],
  hiddenContactFields: [],
  sidebarOrder: ['contact', 'side-skills', 'languages', 'references'],
  photo: '',
  sectionOrder: ['summary', 'experience', 'education', 'projects', 'skills'],
  appearance: { ...defaultAppearance },
}

export const industryLabels: Record<Industry, string> = {
  teknologi: 'Teknologi og IT',
  helse: 'Helse og omsorg',
  bygg: 'Bygg og industri',
  økonomi: 'Økonomi og finans',
  service: 'Salg og service',
  offentlig: 'Offentlig sektor',
}

export const templates = [
  { id: 'nordlys', name: 'Nordlys', note: 'Redaksjonell og rolig', color: '#143f31', source: 'CVklar original', sourceUrl: '' },
  { id: 'fjord', name: 'Fjord', note: 'Tydelig og balansert', color: '#27677a', source: 'CVklar standard', sourceUrl: '' },
  { id: 'klassisk', name: 'Klassisk', note: 'Tidløs og kompakt', color: '#1e293b', source: 'CVklar standard', sourceUrl: '' },
  { id: 'signal', name: 'Signal', note: 'Moderne og kreativ', color: '#ff5c35', source: 'CVklar original', sourceUrl: '' },
  { id: 'ats', name: 'ATS Enkel', note: 'Én kolonne, maskinlesbar', color: '#17231e', source: 'MIT Career Advising', sourceUrl: 'https://capd.mit.edu/resources/make-your-resume-ats-friendly/' },
  { id: 'europass', name: 'Europass', note: 'Kjent europeisk format', color: '#185a9d', source: 'European Union', sourceUrl: 'https://europass.europa.eu/en/create-europass-cv' },
  { id: 'harvard', name: 'Harvard', note: 'Fakta og resultater først', color: '#8b1e2d', source: 'Harvard MCS', sourceUrl: 'https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/' },
  { id: 'akademisk', name: 'Akademisk', note: 'Forskning og utdanning', color: '#203e68', source: 'Oxford Careers', sourceUrl: 'https://www.careers.ox.ac.uk/cvs' },
] as const

export const colorThemes: Array<{
  id: ThemeId
  name: string
  accent: string
  sidebar: string
  tint: string
  highlight: string
}> = [
  { id: 'skog', name: 'Skog', accent: '#1d6d4b', sidebar: '#143f31', tint: '#dfe9e4', highlight: '#cbff5a' },
  { id: 'hav', name: 'Hav', accent: '#1b6480', sidebar: '#17364a', tint: '#dcebf1', highlight: '#85d8e8' },
  { id: 'burgunder', name: 'Burgunder', accent: '#8b2f45', sidebar: '#4a202b', tint: '#f0e1e5', highlight: '#efb1bd' },
  { id: 'sand', name: 'Sand', accent: '#8a5a25', sidebar: '#44362a', tint: '#eee4d3', highlight: '#e3bd6b' },
  { id: 'mono', name: 'Monokrom', accent: '#222222', sidebar: '#222222', tint: '#ececec', highlight: '#a8a8a8' },
]

export const navSources = [
  {
    title: 'NAV: Søknaden og CV-en',
    url: 'https://www.nav.no/soknaden-og-cv',
    checked: '12.09.2025',
  },
  {
    title: 'Arbeidsplassen: Slik skriver du en god CV',
    url: 'https://arbeidsplassen.nav.no/slik-skriver-du-en-god-cv',
    checked: '20.07.2026',
  },
]

export const industrySources: Record<Industry, { title: string; url: string; checked: string }> = {
  teknologi: {
    title: 'Utdanning.no: Systemutvikler',
    url: 'https://utdanning.no/yrker/beskrivelse/systemutvikler',
    checked: '20.07.2026',
  },
  helse: {
    title: 'Utdanning.no: Sykepleier',
    url: 'https://utdanning.no/yrker/beskrivelse/sykepleier',
    checked: '20.07.2026',
  },
  bygg: {
    title: 'Utdanning.no: Tømrer',
    url: 'https://utdanning.no/yrker/beskrivelse/tomrer',
    checked: '20.07.2026',
  },
  økonomi: {
    title: 'Utdanning.no: Revisor',
    url: 'https://utdanning.no/yrker/beskrivelse/revisor',
    checked: '20.07.2026',
  },
  service: {
    title: 'Utdanning.no: Butikkmedarbeider',
    url: 'https://utdanning.no/yrker/beskrivelse/butikkmedarbeider',
    checked: '20.07.2026',
  },
  offentlig: {
    title: 'Utdanning.no: Konsulent i offentlig sektor',
    url: 'https://utdanning.no/yrker/beskrivelse/konsulent_i_offentlig_sektor',
    checked: '20.07.2026',
  },
}
