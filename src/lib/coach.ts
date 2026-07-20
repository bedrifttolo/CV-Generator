import type { CoachFinding, CvData, Industry } from '../types'

const industryTerms: Record<Industry, string[]> = {
  teknologi: ['teknologi', 'system', 'utvikling', 'data', 'API', 'test', 'resultat'],
  helse: ['pasient', 'omsorg', 'samarbeid', 'journal', 'kvalitet', 'ansvar'],
  bygg: ['HMS', 'fagbrev', 'prosjekt', 'kvalitet', 'framdrift', 'sikkerhet'],
  økonomi: ['analyse', 'rapportering', 'budsjett', 'Excel', 'kontroll', 'resultat'],
  service: ['kunde', 'salg', 'mål', 'service', 'kommunikasjon', 'resultat'],
  offentlig: ['forvaltning', 'regelverk', 'saksbehandling', 'samarbeid', 'innbygger'],
}

const jobStopWords = new Set([
  'alle', 'andre', 'arbeid', 'at', 'av', 'bare', 'bli', 'blir', 'dette', 'din', 'dine', 'du', 'eller',
  'en', 'er', 'etter', 'for', 'fra', 'har', 'hos', 'ikke', 'kan', 'med', 'mot', 'noe', 'og', 'også',
  'på', 'seg', 'skal', 'som', 'til', 'ved', 'vi', 'vil', 'vår', 'være', 'ønsker', 'søker', 'ein', 'eit',
])

const extractJobKeywords = (text: string, limit = 12) => {
  const words = text.toLowerCase().match(/[a-zæøå]{3,}/g) ?? []
  return [...new Set(words.filter((word) => !jobStopWords.has(word)))].slice(0, limit)
}

const joinNatural = (items: string[]) => {
  if (items.length < 2) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} og ${items.at(-1)}`
}

export function analyzeCv(data: CvData, industry: Industry, jobText: string): CoachFinding[] {
  const findings: CoachFinding[] = []
  const allText = `${data.title} ${data.summary} ${data.skills.join(' ')} ${data.experience.flatMap((item) => item.bullets).join(' ')}`.toLowerCase()
  const measurable = /\b\d+(?:[,.]\d+)?\s*(?:%|kr|mill|timer|dager|brukere|kunder|prosjekter)?\b/i.test(allText)
  const jobWords = jobText.toLowerCase().match(/[a-zæøå]{5,}/g) ?? []
  const uniqueJobWords = [...new Set(jobWords)].filter((word) => !['dette', 'eller', 'etter', 'innen', 'ønsker', 'søker'].includes(word))
  const matched = uniqueJobWords.filter((word) => allText.includes(word)).length

  findings.push({
    level: data.summary.length >= 140 && data.summary.length <= 520 ? 'sterk' : 'forbedre',
    title: 'Profilen setter retning',
    detail:
      data.summary.length >= 140 && data.summary.length <= 520
        ? 'Sammendraget er konkret og har en god lengde for rask skumlesing.'
        : 'Sikt på 3 til 5 korte linjer som kobler erfaringen din direkte til rollen.',
  })
  findings.push({
    level: measurable ? 'sterk' : 'viktig',
    title: measurable ? 'Du viser målbare resultater' : 'Gjør effekten målbar',
    detail: measurable
      ? 'Tall gjør bidragene lettere å forstå og tro på.'
      : 'Legg til omfang, tid, prosent, antall brukere eller annet konkret resultat i minst to punkter.',
  })
  if (jobText.trim()) {
    const ratio = uniqueJobWords.length ? matched / uniqueJobWords.length : 0
    findings.push({
      level: ratio > 0.25 ? 'sterk' : 'forbedre',
      title: 'Treff mot stillingsannonsen',
      detail: `CV-en treffer ${matched} av ${uniqueJobWords.length} sentrale ord vi fant i teksten. Bruk bare ord som faktisk beskriver kompetansen din.`,
    })
  }
  const missingIndustryTerms = industryTerms[industry].filter((term) => !allText.includes(term.toLowerCase()))
  findings.push({
    level: missingIndustryTerms.length <= 3 ? 'sterk' : 'forbedre',
    title: 'Bransjespråk med substans',
    detail: missingIndustryTerms.length
      ? `Vurder om du ærlig kan dokumentere: ${missingIndustryTerms.slice(0, 4).join(', ')}.`
      : 'Kompetansen er formulert med relevante ord for valgt bransje.',
  })
  findings.push({
    level: data.experience.every((item) => item.bullets.length <= 4) ? 'sterk' : 'forbedre',
    title: 'Kort og prioriterbar erfaring',
    detail: 'Prioriter 2 til 4 punkter per rolle, med det mest relevante øverst.',
  })
  return findings
}

export function makeLetter(data: CvData, company: string, role: string, jobText: string): string {
  const jobKeywords = extractJobKeywords(jobText)
  const score = (text: string) => jobKeywords.filter((word) => text.toLowerCase().includes(word)).length
  const relevantSkills = data.skills
    .map((skill) => ({ skill, score: score(skill) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.skill)
  const bestExperience = [...data.experience].sort((a, b) => score(`${b.role} ${b.company} ${b.bullets.join(' ')}`) - score(`${a.role} ${a.company} ${a.bullets.join(' ')}`))[0]
  const leadSkill = relevantSkills.length ? joinNatural(relevantSkills.slice(0, 3)) : data.skills.slice(0, 3).join(', ')
  const experienceScore = bestExperience ? score(`${bestExperience.role} ${bestExperience.company} ${bestExperience.bullets.join(' ')}`) : 0
  const background = relevantSkills.length
    ? `kompetansen min innen ${leadSkill}`
    : experienceScore > 0 && bestExperience
      ? `erfaringen min som ${bestExperience.role}`
      : `erfaringen min med ${leadSkill}`
  const experienceLead = bestExperience?.bullets.slice().sort((a, b) => score(b) - score(a))[0]
  const jobHighlights = jobText
    .split(/\r?\n|[.!?]\s+/)
    .map((line) => line.replace(/^[^\p{L}\d]+/u, '').trim())
    .filter((line) => line.length >= 10)
    .slice(0, 2)
    .map((line) => line.length > 140 ? `${line.slice(0, 137).replace(/\s+\S*$/, '')}…` : line)
  const advertisementLink = jobHighlights.length
    ? ` I annonsen fremhever dere ${joinNatural(jobHighlights.map((item) => `«${item}»`))}. Det er denne kombinasjonen av oppgaver og arbeidsmiljø som motiverer meg til å søke.`
    : ''
  const experienceText = bestExperience && experienceLead
    ? `Fra rollen som ${bestExperience.role}${bestExperience.company ? ` hos ${bestExperience.company}` : ''} vil jeg særlig trekke frem dette: ${experienceLead}`
    : 'I min erfaring har jeg særlig jobbet med relevante leveranser og tydelig ansvar.'

  return `Søknad på stilling som ${role || '[stilling]'}\n\nHei,\n\nJeg søker stillingen som ${role || '[stilling]'} hos ${company || '[virksomhet]'} fordi jeg ønsker å bruke ${background} til å skape konkrete resultater.${advertisementLink}\n\n${data.summary}\n\n${experienceText} Jeg arbeider strukturert, lærer raskt og tar ansvar fra oppgave til ferdig leveranse.\n\nJeg håper bakgrunnen min kan være relevant for dere, og ser frem til muligheten til å utdype motivasjonen og erfaringen min i et intervju.\n\nVennlig hilsen\n${data.name}\n${data.phone} · ${data.email}`
}

export function analyzeLetterFit(letter: string, jobText: string) {
  const keywords = extractJobKeywords(jobText)
  if (!keywords.length) return null
  const normalizedLetter = letter.toLowerCase()
  const matched = keywords.filter((word) => normalizedLetter.includes(word))
  const missing = keywords.filter((word) => !normalizedLetter.includes(word))
  const ratio = matched.length / keywords.length
  return {
    level: ratio >= .55 ? 'good' : ratio >= .3 ? 'partial' : 'low',
    label: ratio >= .55 ? 'Godt samsvar' : ratio >= .3 ? 'Delvis samsvar' : 'Lavt samsvar',
    matched: matched.length,
    total: keywords.length,
    missing: missing.slice(0, 4),
  }
}
