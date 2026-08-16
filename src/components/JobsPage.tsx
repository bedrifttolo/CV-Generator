import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ExternalLink,
  FilePenLine,
  Link,
  LoaderCircle,
  MapPin,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { ApplicationStatus, JobDeadlineType, JobPosting } from '../types'
import {
  createBlankJob,
  deadlineLabel,
  formatCalendarDate,
  jobFromText,
  localDateValue,
  normalizeJob,
  parseCalendarDate,
  statusLabels,
  statusOptions,
} from '../lib/jobs'

type SortId = 'deadline' | 'newest' | 'oldest' | 'company' | 'title' | 'updated'
type FilterId = 'all' | 'not-applied' | 'applied' | 'interview' | 'rejected' | 'offer'

const filterOptions: Array<[FilterId, string]> = [
  ['all', 'Alle'],
  ['not-applied', 'Ikke søkt'],
  ['applied', 'Søkt'],
  ['interview', 'Intervju'],
  ['rejected', 'Avslag'],
  ['offer', 'Tilbud'],
]

const sourceLabels = {
  finn: 'FINN',
  linkedin: 'LinkedIn',
  arbeidsplassen: 'Arbeidsplassen',
  company: 'Virksomhet',
  other: 'Annen kilde',
}

const csv = (value: string) => [...new Set(value.split(/,|\n/).map((item) => item.trim()).filter(Boolean))]
const toCsv = (value: string[]) => value.join(', ')
const isExternalUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value)
const today = () => localDateValue()

function deadlineSortValue(job: JobPosting) {
  if (job.deadlineType === 'asap') return 0
  if (job.deadlineType === 'ongoing') return 8_000_000_000_000
  const deadline = parseCalendarDate(job.deadline)
  if (!deadline) return 9_000_000_000_000
  const time = deadline.getTime()
  return time < parseCalendarDate(today())!.getTime() ? 7_000_000_000_000 + time : time
}

function sortJobs(jobs: JobPosting[], sort: SortId) {
  return [...jobs].sort((a, b) => {
    if (sort === 'deadline') return deadlineSortValue(a) - deadlineSortValue(b)
    if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
    if (sort === 'company') return a.company.localeCompare(b.company, 'nb')
    if (sort === 'title') return a.title.localeCompare(b.title, 'nb')
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function matchesFilter(job: JobPosting, filter: FilterId) {
  if (filter === 'all') return true
  if (filter === 'not-applied') return job.status === 'saved' || job.status === 'planning'
  return job.status === filter
}

export default function JobsPage({
  jobs,
  onChange,
  onCreateLetter,
}: {
  jobs: JobPosting[]
  onChange: (jobs: JobPosting[]) => void
  onCreateLetter: (jobId: string) => void
}) {
  const [url, setUrl] = useState('')
  const [draft, setDraft] = useState<JobPosting | null>(null)
  const [detail, setDetail] = useState<JobPosting | null>(null)
  const [duplicate, setDuplicate] = useState<JobPosting | null>(null)
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('deadline')
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importStep, setImportStep] = useState('')
  const [error, setError] = useState('')
  const [applyId, setApplyId] = useState<string | null>(null)
  const [appliedAt, setAppliedAt] = useState(today)

  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sortJobs(jobs.filter((job) => matchesFilter(job, filter)).filter((job) => !query || `${job.title} ${job.company} ${job.location || ''} ${job.skills.join(' ')}`.toLowerCase().includes(query)), sort)
  }, [jobs, filter, search, sort])

  const stats = {
    total: jobs.length,
    open: jobs.filter((job) => job.status === 'saved' || job.status === 'planning').length,
    applied: jobs.filter((job) => job.status === 'applied').length,
    interview: jobs.filter((job) => job.status === 'interview').length,
  }

  const updateJob = (id: string, patch: Partial<JobPosting>) => {
    const updatedAt = new Date().toISOString()
    const next = jobs.map((job) => job.id === id ? normalizeJob({ ...job, ...patch, updatedAt }) : job)
    onChange(next)
    setDetail((current) => current?.id === id ? normalizeJob({ ...current, ...patch, updatedAt }) : current)
  }

  const importUrl = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setDuplicate(null)
    let parsed: URL
    try {
      parsed = new URL(url.trim())
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch {
      setError('Denne lenken ser ikke gyldig ut. Bruk en full http- eller https-lenke.')
      return
    }
    const existing = jobs.find((job) => job.sourceUrl.replace(/\/$/, '') === parsed.toString().replace(/\/$/, ''))
    if (existing) {
      setDuplicate(existing)
      return
    }
    setImporting(true)
    setImportStep('Henter annonsen …')
    const steps = ['Leser strukturert innhold …', 'Rydder annonseteksten …', 'Analyserer stillingen …']
    let index = 0
    const timer = window.setInterval(() => {
      setImportStep(steps[Math.min(index, steps.length - 1)])
      index += 1
    }, 1_600)
    try {
      const response = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.toString() }),
      })
      const payload = await response.json().catch(() => ({})) as { job?: Partial<JobPosting>; error?: string }
      if (!response.ok || !payload.job) throw new Error(payload.error || 'Annonsen kunne ikke hentes.')
      const next = createBlankJob(payload.job)
      const redirectedDuplicate = jobs.find((job) => job.sourceUrl && job.sourceUrl.replace(/\/$/, '') === next.sourceUrl.replace(/\/$/, ''))
      if (redirectedDuplicate) {
        setDuplicate(redirectedDuplicate)
      } else {
        setDraft(next)
      }
      setUrl('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Vi fikk ikke tilgang til annonsen. Lim inn annonseteksten manuelt i stedet.')
    } finally {
      window.clearInterval(timer)
      setImporting(false)
      setImportStep('')
    }
  }

  const saveDraft = () => {
    if (!draft || !draft.title.trim() || !draft.company.trim()) return
    const now = new Date().toISOString()
    const next = normalizeJob({ ...draft, updatedAt: now })
    const duplicateUrl = next.sourceUrl && jobs.find((job) => job.id !== next.id && job.sourceUrl.replace(/\/$/, '') === next.sourceUrl.replace(/\/$/, ''))
    if (duplicateUrl) {
      setDraft(null)
      setDuplicate(duplicateUrl)
      return
    }
    onChange(jobs.some((job) => job.id === next.id) ? jobs.map((job) => job.id === next.id ? next : job) : [next, ...jobs])
    setDraft(null)
    setDetail(next)
  }

  const deleteJob = (job: JobPosting) => {
    if (!window.confirm(`Slette «${job.title}» fra den lokale stillingsoversikten?`)) return
    onChange(jobs.filter((item) => item.id !== job.id))
    setDetail(null)
  }

  const markApplied = (job: JobPosting) => {
    updateJob(job.id, { status: 'applied', appliedAt })
    setApplyId(null)
  }

  return (
    <div className="jobs-page">
      <section className="jobs-hero section-wrap">
        <div>
          <span className="eyebrow"><BriefcaseBusiness /> Stillingsoversikt</span>
          <h1>Jobber du <em>vurderer</em></h1>
          <p>Samle interessante stillinger, hold kontroll på frister og gå rett videre til et målrettet søknadsbrev.</p>
        </div>
        <form className="job-import" onSubmit={importUrl}>
          <label htmlFor="job-url">Legg til fra lenke</label>
          <div>
            <Link />
            <input id="job-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Lim inn FINN-annonse eller annen stillingsannonse" disabled={importing} />
            <button className="button" disabled={importing || !url.trim()}>{importing ? <LoaderCircle className="spin" /> : <ArrowRight />} {importing ? 'Henter' : 'Hent annonse'}</button>
          </div>
          <button type="button" className="manual-job-button" onClick={() => { setDraft(createBlankJob()); setError('') }}><Plus /> Legg til manuelt</button>
          <p className="job-import-privacy">Lenken og annonseteksten behandles på server. Når AI er konfigurert kan renset annonsetekst brukes til strukturering.</p>
          {importing && <div className="import-progress" role="status"><span><i /> <i /> <i /></span>{importStep}</div>}
          {error && <div className="import-error" role="alert"><b>Automatisk import stoppet</b><span>{error}</span><button type="button" onClick={() => setDraft(createBlankJob({ sourceUrl: url }))}>Lim inn teksten manuelt</button></div>}
          {duplicate && <div className="duplicate-note" role="status"><Check /><span><b>Denne stillingen er allerede lagret</b>{duplicate.title} · {duplicate.company}</span><button type="button" onClick={() => { setDetail(duplicate); setDuplicate(null) }}>Åpne stilling</button></div>}
        </form>
      </section>

      <section className="jobs-dashboard section-wrap" aria-label="Nøkkeltall">
        {[
          [stats.total, 'lagret'],
          [stats.open, 'ikke søkt'],
          [stats.applied, 'søkt'],
          [stats.interview, 'intervju'],
        ].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="jobs-content section-wrap">
        <div className="jobs-controls">
          <div className="job-filters" aria-label="Filtrer stillinger">
            {filterOptions.map(([id, label]) => <button className={filter === id ? 'active' : ''} onClick={() => setFilter(id)} key={id}>{label}</button>)}
          </div>
          <div className="job-sort-search">
            <label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Søk i stillinger" aria-label="Søk i stillinger" /></label>
            <label>Sorter etter<select value={sort} onChange={(event) => setSort(event.target.value as SortId)}><option value="deadline">Søknadsfrist først</option><option value="newest">Nyest lagt til</option><option value="oldest">Eldst lagt til</option><option value="company">Virksomhet A–Å</option><option value="title">Stilling A–Å</option><option value="updated">Sist oppdatert</option></select></label>
          </div>
        </div>

        {visibleJobs.length ? (
          <div className="job-grid">
            {visibleJobs.map((job) => {
              const deadline = deadlineLabel(job)
              const tags = [...new Set([...job.technologies, ...job.skills, ...job.jobAnalysis.keywords])].slice(0, 5)
              return (
                <article className="job-card" key={job.id}>
                  <div className="job-card-top">
                    <span className="job-source">{sourceLabels[job.source]}</span>
                    <div className={`job-deadline ${deadline.tone}`}><strong>{deadline.date}</strong><small>{deadline.relative}</small></div>
                  </div>
                  <button className="job-card-title" onClick={() => setDetail(job)}><h2>{job.title}</h2><p>{job.company}</p></button>
                  <div className="job-meta">{job.location && <span><MapPin />{job.location}</span>}{job.employmentType && <span><BriefcaseBusiness />{job.employmentType}</span>}</div>
                  {tags.length > 0 && <div className="job-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                  <div className="job-status-row">
                    <label><span className={`status-dot status-${job.status}`} />
                      <select aria-label={`Status for ${job.title}`} value={job.status} onChange={(event) => updateJob(job.id, { status: event.target.value as ApplicationStatus, appliedAt: event.target.value === 'applied' ? job.appliedAt || today() : job.appliedAt })}>{statusOptions.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select>
                    </label>
                    {job.appliedAt && <small>Søkt {formatCalendarDate(job.appliedAt, false)}</small>}
                  </div>
                  {applyId === job.id ? <div className="apply-date"><label>Når søkte du?<input type="date" value={appliedAt} onChange={(event) => setAppliedAt(event.target.value)} /></label><button onClick={() => markApplied(job)}><Check /> Lagre</button><button onClick={() => setApplyId(null)} aria-label="Avbryt"><X /></button></div> : (
                    <div className="job-card-actions">
                      <button className="button button-small" onClick={() => onCreateLetter(job.id)}><FilePenLine /> Lag søknad</button>
                      {job.status !== 'applied' && <button onClick={() => { setApplyId(job.id); setAppliedAt(today()) }}><Check /> Marker som søkt</button>}
                      {isExternalUrl(job.sourceUrl) && <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Åpne originalannonsen for ${job.title}`}><ExternalLink /></a>}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="jobs-empty">
            <BriefcaseBusiness />
            <h2>{jobs.length ? 'Ingen stillinger passer filteret' : 'Din første mulighet starter her'}</h2>
            <p>{jobs.length ? 'Prøv et annet filter eller søkeord.' : 'Importer en annonse fra en lenke, eller legg til en stilling manuelt.'}</p>
            {!jobs.length && <button className="button button-outline" onClick={() => setDraft(createBlankJob())}><Plus /> Legg til manuelt</button>}
          </div>
        )}
      </section>

      <AnimatePresence>
        {draft && <JobEditor job={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveDraft} />}
        {detail && <JobDetails job={detail} onClose={() => setDetail(null)} onEdit={() => { setDraft(detail); setDetail(null) }} onDelete={() => deleteJob(detail)} onCreateLetter={() => onCreateLetter(detail.id)} />}
      </AnimatePresence>
    </div>
  )
}

function JobEditor({ job, onChange, onClose, onSave }: { job: JobPosting; onChange: (job: JobPosting) => void; onClose: () => void; onSave: () => void }) {
  const patch = (next: Partial<JobPosting>) => onChange(normalizeJob({ ...job, ...next }))
  const analyzeText = () => {
    const analyzed = jobFromText(job.originalText || '', job)
    onChange(normalizeJob({ ...analyzed, id: job.id, title: job.title || analyzed.title, company: job.company, sourceUrl: job.sourceUrl, createdAt: job.createdAt }))
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.section className="job-editor-modal" role="dialog" aria-modal="true" aria-labelledby="job-editor-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="job-modal-head"><div><span className="eyebrow"><Sparkles /> Kontroller før lagring</span><h2 id="job-editor-title">{job.title ? 'Vi fant følgende' : 'Legg til stilling'}</h2><p>Alt kan korrigeres. Bare stilling og virksomhet er påkrevd.</p></div><button onClick={onClose} aria-label="Lukk"><X /></button></div>
        <div className="job-form-grid">
          <label>Stilling *<input value={job.title} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label>Virksomhet *<input value={job.company} onChange={(event) => patch({ company: event.target.value })} /></label>
          <label>Sted<input value={job.location || ''} onChange={(event) => patch({ location: event.target.value })} /></label>
          <label>Ansettelsesform<input value={job.employmentType || ''} onChange={(event) => patch({ employmentType: event.target.value })} placeholder="For eksempel fast" /></label>
          <label>Fristtype<select value={job.deadlineType} onChange={(event) => patch({ deadlineType: event.target.value as JobDeadlineType, deadline: event.target.value === 'date' ? job.deadline : undefined })}><option value="unknown">Ikke oppgitt</option><option value="date">Dato</option><option value="ongoing">Fortløpende</option><option value="asap">Snarest</option></select></label>
          <label>Søknadsfrist<input type="date" disabled={job.deadlineType !== 'date'} value={job.deadline || ''} onChange={(event) => patch({ deadline: event.target.value, deadlineType: event.target.value ? 'date' : 'unknown' })} /></label>
          <label className="span-two">Original lenke<input type="url" value={job.sourceUrl} onChange={(event) => patch({ sourceUrl: event.target.value })} placeholder="https://…" /></label>
          <label className="span-two">Kort beskrivelse<textarea rows={4} value={job.description || ''} onChange={(event) => patch({ description: event.target.value })} /></label>
          <label className="span-two">Viktig kompetanse <small>skill med komma</small><input value={toCsv(job.skills)} onChange={(event) => patch({ skills: csv(event.target.value) })} placeholder="React, TypeScript, samarbeid" /></label>
          <label className="span-two">Arbeidsoppgaver <small>én per linje</small><textarea rows={4} value={job.responsibilities.join('\n')} onChange={(event) => patch({ responsibilities: csv(event.target.value), jobAnalysis: { ...job.jobAnalysis, responsibilities: csv(event.target.value) } })} /></label>
          <label className="span-two">Kvalifikasjoner <small>én per linje</small><textarea rows={4} value={job.requiredQualifications.join('\n')} onChange={(event) => patch({ requiredQualifications: csv(event.target.value), jobAnalysis: { ...job.jobAnalysis, coreRequirements: csv(event.target.value) } })} /></label>
          <label className="span-two">Teknologier <small>skill med komma</small><input value={toCsv(job.technologies)} onChange={(event) => patch({ technologies: csv(event.target.value), jobAnalysis: { ...job.jobAnalysis, technologies: csv(event.target.value) } })} /></label>
          <label className="span-two">Annonsetekst<textarea rows={10} maxLength={40_000} value={job.originalText || ''} onChange={(event) => patch({ originalText: event.target.value })} placeholder="Lim inn hele stillingsannonsen her …" /><small>{job.originalText?.length || 0}/40000</small></label>
        </div>
        <div className="job-modal-actions"><button className="text-button" onClick={analyzeText} disabled={!job.originalText?.trim()}><Sparkles /> Finn frist og nøkkelord lokalt</button><span><button className="button button-outline" onClick={onClose}>Avbryt</button><button className="button" onClick={onSave} disabled={!job.title.trim() || !job.company.trim()}><Check /> Lagre stilling</button></span></div>
      </motion.section>
    </div>
  )
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return <section><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>
}

function JobDetails({ job, onClose, onEdit, onDelete, onCreateLetter }: { job: JobPosting; onClose: () => void; onEdit: () => void; onDelete: () => void; onCreateLetter: () => void }) {
  const deadline = deadlineLabel(job)
  return (
    <div className="job-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.aside className="job-drawer" role="dialog" aria-modal="true" aria-labelledby="job-detail-title" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Lukk"><X /></button>
        <span className="eyebrow">{sourceLabels[job.source]} · {statusLabels[job.status]}</span>
        <h2 id="job-detail-title">{job.title}</h2><p className="drawer-company">{job.company}</p>
        <div className="drawer-facts">{job.location && <span><MapPin />{job.location}</span>}{job.employmentType && <span><BriefcaseBusiness />{job.employmentType}</span>}<span className={deadline.tone}><CalendarDays />{deadline.date} · {deadline.relative}</span></div>
        {job.description && <section><h3>Om stillingen</h3><p>{job.description}</p></section>}
        <DetailList title="Arbeidsoppgaver" items={job.responsibilities} />
        <DetailList title="Kvalifikasjoner" items={job.requiredQualifications} />
        <DetailList title="Ønskede kvalifikasjoner" items={job.preferredQualifications} />
        {[...new Set([...job.technologies, ...job.skills])].length > 0 && <section><h3>Kompetanse</h3><div className="job-tags">{[...new Set([...job.technologies, ...job.skills])].map((item) => <span key={item}>{item}</span>)}</div></section>}
        {job.contactPersons.length > 0 && <section><h3>Kontaktperson</h3>{job.contactPersons.map((contact, index) => <address key={`${contact.name}-${index}`}><b>{contact.name}</b>{contact.role && <span>{contact.role}</span>}{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}</address>)}</section>}
        <div className="drawer-actions"><button className="button" onClick={onCreateLetter}><FilePenLine /> Lag søknadsbrev</button>{isExternalUrl(job.sourceUrl) && <a className="button button-outline" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">Original annonse <ExternalLink /></a>}<button onClick={onEdit}><PenLine /> Rediger</button><button className="danger-action" onClick={onDelete}><Trash2 /> Slett</button></div>
      </motion.aside>
    </div>
  )
}
