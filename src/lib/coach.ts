import type { CoachFinding, CvData, Industry } from '../types'

const industryTerms: Record<Industry, string[]> = {
  teknologi: ['teknologi', 'system', 'utvikling', 'data', 'API', 'test', 'resultat'],
  helse: ['pasient', 'omsorg', 'samarbeid', 'journal', 'kvalitet', 'ansvar'],
  bygg: ['HMS', 'fagbrev', 'prosjekt', 'kvalitet', 'framdrift', 'sikkerhet'],
  økonomi: ['analyse', 'rapportering', 'budsjett', 'Excel', 'kontroll', 'resultat'],
  service: ['kunde', 'salg', 'mål', 'service', 'kommunikasjon', 'resultat'],
  offentlig: ['forvaltning', 'regelverk', 'saksbehandling', 'samarbeid', 'innbygger'],
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
        : 'Sikt på 3–5 korte linjer som kobler erfaringen din direkte til rollen.',
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
    detail: 'Prioriter 2–4 punkter per rolle, med det mest relevante øverst.',
  })
  return findings
}

export function makeLetter(data: CvData, company: string, role: string, jobText: string): string {
  const leadSkill = data.skills.slice(0, 3).join(', ')
  const requirement = jobText.match(/(?:vi ser etter|ønsker|kvalifikasjoner)[:\s]+([^.!?]{20,130})/i)?.[1]
  return `Søknad på stilling som ${role || '[stilling]'}\n\nHei,\n\nJeg søker stillingen som ${role || '[stilling]'} hos ${company || '[virksomhet]'} fordi jeg ønsker å bruke erfaringen min med ${leadSkill} til å skape konkrete resultater i et miljø der kvalitet og samarbeid står sentralt.\n\n${data.summary}\n\nI min nåværende erfaring har jeg særlig jobbet med ${data.experience[0]?.bullets[0]?.toLowerCase() || 'relevante leveranser og tydelig ansvar'}. ${requirement ? `Jeg merket meg at dere ser etter ${requirement.trim()}, og dette er et område jeg gjerne utdyper med konkrete eksempler i et intervju.` : 'Jeg arbeider strukturert, lærer raskt og tar ansvar fra oppgave til ferdig leveranse.'}\n\nJeg håper bakgrunnen min kan være relevant for dere, og ser frem til muligheten til å utdype motivasjonen og erfaringen min i et intervju.\n\nVennlig hilsen\n${data.name}\n${data.phone} · ${data.email}`
}
