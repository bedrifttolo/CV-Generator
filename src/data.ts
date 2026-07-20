import profileUrl from '../assets/avatar-placeholder.svg'
import type { CvData, Industry, ThemeId } from './types'

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
    },
    {
      id: 'exp-2',
      role: 'Kunderådgiver',
      company: 'Sentrum Kundeservice AS',
      period: '2020 til 2023',
      bullets: [
        'Fulgt opp kunder, avklart behov og samarbeidet med fagmiljøer om gode løsninger.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Bachelor i organisasjon og ledelse',
      school: 'Norsk eksempeluniversitet',
      period: '2017 til 2020',
    },
  ],
  languages: ['Norsk, morsmål', 'Engelsk, godt nivå'],
  references: ['Oppgis på forespørsel'],
  customSections: [],
  hiddenSections: [],
  hiddenContactFields: [],
  sidebarOrder: ['contact', 'side-skills', 'languages', 'references'],
  photo: profileUrl,
  sectionOrder: ['summary', 'experience', 'education', 'skills'],
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
  experience: [
    {
      id: 'blank-exp-1',
      role: 'Stillingstittel',
      company: 'Arbeidsgiver',
      period: 'År til år',
      bullets: ['Beskriv et konkret ansvar, en oppgave eller et målbart resultat.'],
    },
  ],
  education: [
    {
      id: 'blank-edu-1',
      degree: 'Utdanning eller grad',
      school: 'Skole eller studiested',
      period: 'År til år',
    },
  ],
  languages: ['Norsk, nivå', 'Engelsk, nivå'],
  references: ['Oppgis på forespørsel'],
  customSections: [],
  hiddenSections: [],
  hiddenContactFields: [],
  sidebarOrder: ['contact', 'side-skills', 'languages', 'references'],
  photo: '',
  sectionOrder: ['summary', 'experience', 'education', 'skills'],
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
