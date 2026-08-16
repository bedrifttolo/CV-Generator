import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Check,
  Download,
  FileText,
  Lightbulb,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import type { CandidateMatch, CoverLetter, CvData, JobPosting } from '../types'
import { analyzeLetterFit, makeLetter } from '../lib/coach'
import { deadlineLabel, jobFromText, localCandidateMatch, sanitizedCandidate, sanitizedJob } from '../lib/jobs'
import { newId } from '../lib/document'

const standardLetter = `Søknad på stilling som [stilling]

Hei,

Jeg ønsker å søke på stillingen som [stilling] hos [virksomhet]. Rollen virker interessant fordi den kombinerer oppgaver jeg motiveres av med et miljø der jeg kan bidra og utvikle meg videre.

Gjennom tidligere erfaring har jeg lært å arbeide strukturert, samarbeide godt og følge opp oppgaver fra start til slutt. [Legg inn et kort, konkret eksempel som viser et relevant resultat eller ansvar.]

Jeg tror særlig min erfaring med [relevant kompetanse] kan være nyttig i denne rollen. Samtidig er jeg nysgjerrig, lærer raskt og tar ansvar for å levere arbeid av god kvalitet.

Jeg håper bakgrunnen min kan være relevant, og ser frem til muligheten til å utdype motivasjonen og erfaringen min i et intervju.

Vennlig hilsen
[Navnet ditt]
[Telefon] · [E-post]`

type AiAction = 'analyze' | 'advice' | 'opening' | 'generate' | 'improve'

const aiActions: Array<[AiAction, string]> = [
  ['analyze', 'Analyser treff'],
  ['advice', 'Hva bør jeg fremheve?'],
  ['opening', 'Foreslå åpning'],
  ['improve', 'Forbedre teksten'],
]

const personalizedStarter = (cv: CvData, company: string, role: string) => standardLetter
  .replaceAll('[stilling]', role || '[stilling]')
  .replaceAll('[virksomhet]', company || '[virksomhet]')
  .replace('[Navnet ditt]', cv.name || '[Navnet ditt]')
  .replace('[Telefon]', cv.phone || '[Telefon]')
  .replace('[E-post]', cv.email || '[E-post]')

export default function LetterStudio({
  cv,
  jobs,
  coverLetters,
  onLettersChange,
  initialJobId,
  onSelectedJobChange,
}: {
  cv: CvData
  jobs: JobPosting[]
  coverLetters: CoverLetter[]
  onLettersChange: (letters: CoverLetter[]) => void
  initialJobId?: string
  onSelectedJobChange: (jobId?: string) => void
}) {
  const initialJob = jobs.find((job) => job.id === initialJobId)
  const initialSavedLetter = initialJob ? coverLetters.find((item) => item.jobId === initialJob.id) : coverLetters.find((item) => !item.jobId)
  const [selectedJobId, setSelectedJobId] = useState(initialJob?.id || '')
  const [company, setCompany] = useState(initialJob?.company || '')
  const [role, setRole] = useState(initialJob?.title || '')
  const [jobText, setJobText] = useState(initialJob?.originalText || initialJob?.description || '')
  const [letter, setLetter] = useState(initialSavedLetter?.content || (initialJob ? personalizedStarter(cv, initialJob.company, initialJob.title) : standardLetter))
  const [aiResult, setAiResult] = useState<CandidateMatch | null>(null)
  const [busyAction, setBusyAction] = useState<AiAction | null>(null)
  const [notice, setNotice] = useState('')

  const selectedJob = jobs.find((job) => job.id === selectedJobId)
  const activeJob = useMemo(() => selectedJob || jobFromText(jobText, { title: role, company }), [selectedJob, jobText, role, company])
  const localMatch = useMemo(() => localCandidateMatch(cv, activeJob), [cv, activeJob])
  const letterFit = useMemo(() => analyzeLetterFit(letter, jobText), [letter, jobText])

  const useJob = (jobId: string) => {
    setSelectedJobId(jobId)
    setAiResult(null)
    setNotice('')
    const job = jobs.find((item) => item.id === jobId)
    if (!job) {
      const manualLetter = coverLetters.find((item) => !item.jobId)
      setCompany(manualLetter?.company || '')
      setRole(manualLetter?.position || '')
      setJobText('')
      setLetter(manualLetter?.content || standardLetter)
      return
    }
    setCompany(job.company)
    setRole(job.title)
    setJobText(job.originalText || job.description || '')
    setLetter(coverLetters.find((item) => item.jobId === job.id)?.content || personalizedStarter(cv, job.company, job.title))
  }

  useEffect(() => {
    const routeJobId = initialJobId || ''
    if (routeJobId !== selectedJobId) useJob(routeJobId)
    // URL-valget skal kun overstyre når det faktisk endres.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId])

  const saveLetter = (content: string) => {
    setLetter(content)
    const now = new Date().toISOString()
    const existing = selectedJobId
      ? coverLetters.find((item) => item.jobId === selectedJobId)
      : coverLetters.find((item) => !item.jobId)
    const saved: CoverLetter = {
      id: existing?.id || newId('letter'),
      jobId: selectedJobId || undefined,
      company,
      position: role,
      content,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    onLettersChange(existing ? coverLetters.map((item) => item.id === existing.id ? saved : item) : [saved, ...coverLetters])
  }

  const localFallback = (action: AiAction, message: string) => {
    const fallback = { ...localMatch }
    if (action === 'generate') fallback.letter = makeLetter(cv, company, role, jobText)
    if (action === 'opening') fallback.suggestedOpening = `Jeg søker stillingen som ${role || '[stilling]'} hos ${company || '[virksomhet]'} fordi rollen gir meg mulighet til å bruke dokumentert erfaring fra CV-en på oppgavene dere beskriver.`
    if (action === 'improve') fallback.advice = [...fallback.advice, 'AI-forbedring krever at modellen er konfigurert. Du kan fortsatt redigere teksten manuelt.']
    setAiResult(fallback)
    if (fallback.letter) saveLetter(fallback.letter)
    setNotice(`${message} Viser lokal relevanssjekk i stedet.`)
  }

  const runAi = async (action: AiAction) => {
    if (!role.trim() && !jobText.trim()) {
      setNotice('Velg en lagret stilling eller fyll inn stilling og annonsetekst først.')
      return
    }
    setBusyAction(action)
    setNotice('Relevant CV- og annonseinnhold behandles. Kontaktinformasjon er fjernet fra forespørselen.')
    try {
      const response = await fetch('/api/ai/job-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          candidate: sanitizedCandidate(cv),
          job: sanitizedJob(activeJob),
          existingLetter: action === 'improve' ? letter : '',
        }),
      })
      const payload = await response.json().catch(() => ({})) as { result?: CandidateMatch; error?: string }
      if (!response.ok || !payload.result) throw new Error(payload.error || 'AI-tjenesten svarte ikke.')
      setAiResult(payload.result)
      if ((action === 'generate' || action === 'improve') && payload.result.letter) saveLetter(payload.result.letter)
      setNotice('AI-resultatet er klart. Kontroller alle påstander før du bruker teksten.')
    } catch (error) {
      localFallback(action, error instanceof Error ? error.message : 'AI-tjenesten er ikke tilgjengelig.')
    } finally {
      setBusyAction(null)
    }
  }

  const generateLocal = () => {
    saveLetter(makeLetter(cv, company, role, jobText))
    setAiResult(localMatch)
    setNotice('Et lokalt, regelbasert utkast er laget uten ekstern overføring.')
  }

  const download = async () => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    const lines = pdf.splitTextToSize(letter, 170)
    pdf.text(lines, 20, 24)
    pdf.save(`${role || 'Søknadsbrev'}.pdf`)
  }

  const selectedDeadline = selectedJob ? deadlineLabel(selectedJob) : null

  return (
    <div className="letter-page">
      <div className="letter-heading"><span className="eyebrow">Søknadsstudio</span><h1>Et godt brev svarer på <em>én jobb</em></h1><p>Velg en lagret stilling, se dokumenterte treff og behold kontroll over hvert ord.</p></div>
      <div className="letter-workspace section-wrap">
        <aside>
          <label className="job-selector">Stillingen du søker på<select value={selectedJobId} onChange={(event) => { useJob(event.target.value); onSelectedJobChange(event.target.value || undefined) }}><option value="">Skriv inn manuelt</option>{jobs.map((job) => <option value={job.id} key={job.id}>{job.title} – {job.company}</option>)}</select></label>

          {selectedJob && <div className="selected-job-summary"><span><BriefcaseBusiness /></span><div><b>{selectedJob.title}</b><p>{selectedJob.company}</p>{selectedJob.location && <small><MapPin />{selectedJob.location}</small>}{selectedDeadline && <small>{selectedDeadline.date} · {selectedDeadline.relative}</small>}</div></div>}

          <details className="letter-job-details" open={!selectedJob}>
            <summary>{selectedJob ? 'Vis og rediger annonsegrunnlag' : 'Stillingsinformasjon'}</summary>
            <label>Virksomhet<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="For eksempel NRK" /></label>
            <label>Stilling<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="For eksempel frontend-utvikler" /></label>
            <label>Stillingsannonse<textarea rows={9} maxLength={40_000} value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="Lim inn annonsen …" /></label>
          </details>

          <section className="letter-ai-panel">
            <span className="eyebrow"><Sparkles /> AI-råd</span>
            <h2>Finn argumentene som holder</h2>
            <p className="local-match-label"><ShieldCheck /> Lokal relevanssjekk · {localMatch.strongMatches.length} dokumenterte treff</p>
            {localMatch.strongMatches.length > 0 && <div className="match-chips">{localMatch.strongMatches.slice(0, 5).map((item) => <span key={item.requirement}>{item.requirement}</span>)}</div>}
            {localMatch.missingRequirements.length > 0 && <p className="missing-note"><b>Ikke dokumentert:</b> {localMatch.missingRequirements.slice(0, 4).join(', ')}. Ikke påstå dette uten at det stemmer.</p>}
            <div className="ai-action-grid">{aiActions.map(([id, label]) => <button key={id} disabled={Boolean(busyAction)} onClick={() => runAi(id)}>{busyAction === id ? <LoaderCircle className="spin" /> : <Sparkles />}{label}</button>)}</div>
            <button className="button button-full" onClick={() => runAi('generate')} disabled={Boolean(busyAction)}>{busyAction === 'generate' ? <LoaderCircle className="spin" /> : <WandSparkles />} Lag AI-førsteutkast</button>
            <button className="local-draft-button" onClick={generateLocal}><ShieldCheck /> Lag lokalt førsteutkast</button>
            <p className="ai-data-note"><ShieldCheck /> Når du bruker AI-knappene sendes relevant CV- og annonseinnhold til AI-tjenesten. Ditt telefonnummer, e-post, bosted og profilbilde utelates.</p>
          </section>

          {notice && <div className="notice" role="status">{notice}</div>}
          {aiResult && <AiResult result={aiResult} onUseOpening={() => aiResult.suggestedOpening && saveLetter(`${aiResult.suggestedOpening}\n\n${letter}`)} />}
          {letterFit && <div className={`letter-fit ${letterFit.level}`} role="status"><Lightbulb /><div><b>Lokal tekstsjekk: {letterFit.label}</b><p>Brevet dekker {letterFit.matched} av {letterFit.total} sentrale begreper fra annonsen.</p>{letterFit.missing.length > 0 && <small>Vurder bare ord du kan dokumentere: {letterFit.missing.join(', ')}.</small>}</div></div>}
        </aside>
        <section className="letter-paper">
          <div className="letter-toolbar"><span><FileText /> Søknadsbrev {selectedJob && <small>· koblet til {selectedJob.company}</small>}</span><div><small><Check /> Lagres lokalt</small><button onClick={download}><Download /> PDF</button></div></div>
          <textarea aria-label="Rediger søknadsbrev" value={letter} onChange={(event) => saveLetter(event.target.value)} />
          <div className="letter-note"><Sparkles /> AI-utkast kan inneholde feil. Kontroller at alle påstander er riktige og skrevet med din stemme.</div>
        </section>
      </div>
    </div>
  )
}

function AiResult({ result, onUseOpening }: { result: CandidateMatch; onUseOpening: () => void }) {
  return (
    <section className="ai-result">
      <span className="eyebrow"><Check /> Anbefalt fokus</span>
      {result.advice.length > 0 && <ol>{result.advice.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>}
      {result.experiencesToHighlight.length > 0 && <div><b>Erfaring å fremheve</b>{result.experiencesToHighlight.map((item) => <span key={item}>{item}</span>)}</div>}
      {result.projectsToHighlight.length > 0 && <div><b>Prosjekter å fremheve</b>{result.projectsToHighlight.map((item) => <span key={item}>{item}</span>)}</div>}
      {result.missingRequirements.length > 0 && <div className="ai-result-missing"><b>Mangler eller er ikke dokumentert</b>{result.missingRequirements.map((item) => <span key={item}>{item}</span>)}</div>}
      {result.suggestedOpening && <div className="suggested-opening"><b>Forslag til åpning</b><p>{result.suggestedOpening}</p><button onClick={onUseOpening}>Bruk åpningen</button></div>}
    </section>
  )
}
