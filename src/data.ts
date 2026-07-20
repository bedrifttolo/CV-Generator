import profileUrl from '../assets/profile-web.jpg'
import type { CvData, Industry } from './types'

export const defaultCv: CvData = {
  name: 'Thomas Tolo Jensen',
  title: 'Fullstack-utvikler · Masterstudent i programvareutvikling',
  email: 'thomastj278@gmail.com',
  phone: '+47 918 91 669',
  location: 'Bergen, Norge',
  website: 'tolojensentech.no',
  summary:
    'Masterstudent i programvareutvikling med bachelor i informatikk, matematikk og økonomi. Bygger komplette digitale produkter fra idé og brukerbehov til frontend, API, database og lansering.',
  skills: [
    'React & TypeScript',
    'Java & Spring Boot',
    'PostgreSQL',
    'Docker & CI/CD',
    'Produktutvikling',
    'Norsk og engelsk',
  ],
  experience: [
    {
      id: 'exp-1',
      role: 'Grunnlegger og fullstack-utvikler',
      company: 'Tolo Jensen Technologies',
      period: '2026 – nå',
      bullets: [
        'Driver et programvarestudio fra idé og brukerbehov til kode, test og lansering.',
        'Utvikler web- og mobilprodukter med React, TypeScript, Spring Boot og PostgreSQL.',
      ],
    },
    {
      id: 'exp-2',
      role: 'Støttekontakt',
      company: 'Bergen kommune',
      period: '2024 – nå',
      bullets: [
        'Planlegger aktiviteter tilpasset brukerens behov og skaper trygg struktur i hverdagen.',
      ],
    },
    {
      id: 'exp-3',
      role: 'Mekaniker',
      company: 'Ryde Technology AS',
      period: '2023 – 2024',
      bullets: ['Feilsøkte, reparerte og kvalitetssikret elektriske systemer i høyt tempo.'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Master i programvareutvikling',
      school: 'Universitetet i Bergen & HVL',
      period: '2025 – 2027',
    },
    {
      id: 'edu-2',
      degree: 'Bachelor i informatikk, matematikk og økonomi',
      school: 'Universitetet i Bergen',
      period: '2022 – 2025',
    },
  ],
  languages: ['Norsk – flytende', 'Engelsk – flytende', 'Spansk – grunnleggende'],
  photo: profileUrl,
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
  { id: 'nordlys', name: 'Nordlys', note: 'Redaksjonell og rolig', color: '#143f31' },
  { id: 'fjord', name: 'Fjord', note: 'Din originale mal', color: '#27677a' },
  { id: 'klassisk', name: 'Klassisk', note: 'ATS-vennlig og enkel', color: '#1e293b' },
  { id: 'signal', name: 'Signal', note: 'Moderne og kreativ', color: '#ff5c35' },
] as const

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
