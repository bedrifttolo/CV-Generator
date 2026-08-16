import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  Menu,
  PenLine,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react'
import CvPreview from './components/CvPreview'
import GoogleAd from './components/GoogleAd'
import JobsPage from './components/JobsPage'
import LetterStudio from './components/LetterStudio'
import {
  blankCv,
  colorThemes,
  defaultCv,
  marginRange,
  spaceScales,
  typeScales,
  industryLabels,
  industrySources,
  navSources,
  templates,
} from './data'
import { analyzeCv } from './lib/coach'
import { applyReferencePlacement, newId, normalizeCv } from './lib/document'
import { acceptedImageTypes, readImageFile } from './lib/image'
import { JOBS_STORAGE_KEY, LETTERS_STORAGE_KEY, loadCoverLetters, loadJobs } from './lib/jobs'
import { extractFileText, parseResume } from './lib/parser'
import { exportCvPdf } from './lib/pdf'
import type {
  CvData,
  CoverLetter,
  Industry,
  JobPosting,
  Project,
  Reference,
  ReferencePlacement,
  SkillGroup,
  SpaceScaleId,
  TemplateId,
  ThemeId,
  TypeScaleId,
} from './types'

type View = 'home' | 'builder' | 'jobs' | 'guide' | 'letter'
type Legal = 'privacy' | 'terms' | null
type BuilderTab = 'innhold' | 'mal' | 'ai'

const cloneDefault = () => structuredClone(defaultCv)
const cloneBlank = () => structuredClone(blankCv)
const isLegacyPersonalExample = (data: Partial<CvData>) =>
  data.name === 'Thomas Tolo Jensen' ||
  data.email?.toLowerCase().includes('thomastj278') ||
  data.website?.toLowerCase().includes('tolojensentech')

function loadCv(): CvData {
  try {
    const saved = localStorage.getItem('cvklar-document')
    if (!saved) return cloneDefault()
    const parsed = JSON.parse(saved) as Partial<CvData>
    if (isLegacyPersonalExample(parsed)) return cloneDefault()
    return normalizeCv(parsed, cloneDefault())
  } catch {
    return cloneDefault()
  }
}

const viewPaths: Record<View, string> = {
  home: '/',
  builder: '/cv',
  jobs: '/stillinger',
  letter: '/soknadsbrev',
  guide: '/cv-guiden',
}

function routeFromLocation() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const view = (Object.entries(viewPaths).find(([, route]) => route === path)?.[0] as View | undefined) || 'home'
  const params = new URLSearchParams(window.location.search)
  return { view, jobId: params.get('job') || params.get('jobId') || undefined }
}

function App() {
  const initialRoute = useMemo(routeFromLocation, [])
  const [view, setView] = useState<View>(initialRoute.view)
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(initialRoute.jobId)
  const [cv, setCv] = useState<CvData>(loadCv)
  const [jobs, setJobs] = useState<JobPosting[]>(loadJobs)
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>(loadCoverLetters)
  const [template, setTemplate] = useState<TemplateId>(() => (localStorage.getItem('cvklar-template') as TemplateId) || 'nordlys')
  const [theme, setTheme] = useState<ThemeId>(() => (localStorage.getItem('cvklar-theme') as ThemeId) || 'skog')
  const [legal, setLegal] = useState<Legal>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [consent, setConsent] = useState(() => localStorage.getItem('cvklar-consent'))

  useEffect(() => {
    localStorage.setItem('cvklar-document', JSON.stringify(cv))
  }, [cv])

  useEffect(() => {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs))
  }, [jobs])

  useEffect(() => {
    localStorage.setItem(LETTERS_STORAGE_KEY, JSON.stringify(coverLetters))
  }, [coverLetters])

  useEffect(() => {
    localStorage.setItem('cvklar-template', template)
    localStorage.setItem('cvklar-theme', theme)
  }, [template, theme])

  useEffect(() => {
    const onPopState = () => {
      const route = routeFromLocation()
      setView(route.view)
      setSelectedJobId(route.jobId)
      setMobileMenu(false)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: View, jobId?: string) => {
    const search = next === 'letter' && jobId ? `?job=${encodeURIComponent(jobId)}` : ''
    window.history.pushState({}, '', `${viewPaths[next]}${search}`)
    setView(next)
    setSelectedJobId(jobId)
    setMobileMenu(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startBlank = () => {
    setCv(cloneBlank())
    navigate('builder')
  }

  const selectTemplate = (id: TemplateId) => {
    setTemplate(id)
    navigate('builder')
  }

  return (
    <div className="app-shell">
      <Header view={view} navigate={navigate} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />
      <AnimatePresence mode="wait">
        <motion.main
          key={view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {view === 'home' && <Home onStartBlank={startBlank} onOpen={() => navigate('builder')} onGuide={() => navigate('guide')} onSelectTemplate={selectTemplate} adsAllowed={consent === 'accepted'} />}
          {view === 'builder' && <Builder cv={cv} setCv={setCv} template={template} setTemplate={setTemplate} theme={theme} setTheme={setTheme} />}
          {view === 'jobs' && <JobsPage jobs={jobs} onChange={setJobs} onCreateLetter={(jobId) => navigate('letter', jobId)} />}
          {view === 'guide' && <Guide onStart={startBlank} />}
          {view === 'letter' && <LetterStudio cv={cv} jobs={jobs} coverLetters={coverLetters} onLettersChange={setCoverLetters} initialJobId={selectedJobId} onSelectedJobChange={(jobId) => navigate('letter', jobId)} />}
        </motion.main>
      </AnimatePresence>
      {view !== 'builder' && <Footer navigate={navigate} setLegal={setLegal} />}
      <LegalModal type={legal} onClose={() => setLegal(null)} />
      {!consent && (
        <ConsentBanner onChoice={(value) => {
          localStorage.setItem('cvklar-consent', value)
          setConsent(value)
        }} />
      )}
    </div>
  )
}

function Header({
  view,
  navigate,
  mobileMenu,
  setMobileMenu,
}: {
  view: View
  navigate: (view: View) => void
  mobileMenu: boolean
  setMobileMenu: (value: boolean) => void
}) {
  const items: Array<[View, string]> = [['builder', 'Lag CV'], ['jobs', 'Stillinger'], ['letter', 'Søknadsbrev'], ['guide', 'CV-guiden']]
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate('home')} aria-label="CVklar forside">
        <span className="brand-mark">ck</span><span>CVklar</span>
      </button>
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'} aria-label="Hovedmeny">
        {items.map(([target, label]) => (
          <button className={view === target ? 'active' : ''} key={target} onClick={() => navigate(target)}>{label}</button>
        ))}
      </nav>
      <div className="header-actions">
        <span className="privacy-pill"><ShieldCheck size={15} /> Local-first</span>
        <button className="button button-small" onClick={() => navigate('builder')}>Åpne CV <ArrowRight size={16} /></button>
        <button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-expanded={mobileMenu} aria-label="Vis meny">
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  )
}

function Home({ onStartBlank, onOpen, onGuide, onSelectTemplate, adsAllowed }: { onStartBlank: () => void; onOpen: () => void; onGuide: () => void; onSelectTemplate: (id: TemplateId) => void; adsAllowed: boolean }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .12 }}>Bygget for norsk arbeidsliv</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08, duration: .55 }}>
            CV-en som får frem <em>det du kan</em>
          </motion.h1>
          <p>Start fra scratch eller importer CV-en du allerede har. Du redigerer direkte, får målrettede råd og laster ned en profesjonell PDF.</p>
          <div className="hero-actions">
            <button className="button button-large" onClick={onStartBlank}>Start fra scratch <ArrowRight size={18} /></button>
            <button className="text-button" onClick={onOpen}><UploadCloud size={17} /> Importer CV <span className="optional-tag">valgfritt</span></button>
          </div>
          <button className="guide-link" onClick={onGuide}>Se hvordan det virker <ArrowDown size={15} /></button>
          <div className="trust-row">
            <span><Check size={14} /> Ingen konto</span>
            <span><Check size={14} /> CV lagres lokalt</span>
            <span><Check size={14} /> Gratis PDF</span>
          </div>
        </div>
        <HeroDocument />
      </section>
      <GoogleAd allowed={adsAllowed} slot={import.meta.env.VITE_GOOGLE_ADS_SLOT_HOME} />
      <section className="steps-section section-wrap">
        <div className="section-heading split-heading">
          <div><span className="eyebrow">Tre rolige steg</span><h2>Fra blank side til <em>klar søknad</em></h2></div>
          <p>Ingen lang skjema. Skriv selv fra scratch, eller importer det du allerede har. Du bestemmer startpunktet.</p>
        </div>
        <div className="steps-grid">
          {[
            ['01', 'Velg startpunkt', 'Start med et tomt dokument. Import av PDF, Word eller tekst er valgfritt.', <FileText />],
            ['02', 'Gjør den til din', 'Skriv rett i dokumentet, flytt seksjoner, legg til bilde og bytt mal.', <PenLine />],
            ['03', 'Bli søkeklar', 'Få bransjetilpassede råd og last ned CV og søknadsbrev som PDF.', <Sparkles />],
          ].map(([number, title, text, icon], index) => (
            <motion.article className="step" key={title as string} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}>
              <span className="step-number">{number}</span><div className="step-icon">{icon}</div><h3>{title}</h3><p>{text}</p>
            </motion.article>
          ))}
        </div>
      </section>
      <section className="feature-band">
        <div className="feature-copy">
          <span className="eyebrow light">Rediger som et dokument</span>
          <h2>Se resultatet mens du skriver</h2>
          <p>Klikk på teksten i CV-en. Ingen skjulte felt og ingen overraskelser når PDF-en lastes ned.</p>
          <ul>
            <li><Check /> Flytt erfaring og seksjoner</li>
            <li><Check /> Åtte gjennomarbeidede maler</li>
            <li><Check /> Profilbilde og klikkbare lenker</li>
            <li><Check /> Automatisk lagring i nettleseren</li>
          </ul>
          <button className="button button-light" onClick={onStartBlank}>Start med tom CV <ArrowRight /></button>
        </div>
        <EditorMockup />
      </section>
      <section className="ai-showcase section-wrap">
        <div className="ai-orbit"><Bot /><span>AI</span></div>
        <div>
          <span className="eyebrow">Ansettbar AI</span>
          <h2>Råd som tar bransjen din på alvor</h2>
        </div>
        <div>
          <p>Velg bransje og lim inn stillingsannonsen. Coachen ser etter relevans, målbare resultater og manglende nøkkelord med åpne kilder og uten å sende CV-en din bort.</p>
          <button className="text-button dark" onClick={onOpen}>Analyser CV-en i arbeidsbordet <ArrowRight /></button>
        </div>
      </section>
      <section className="templates-section section-wrap">
        <div className="section-heading"><span className="eyebrow">Maler med personlighet</span><h2>Riktig uttrykk med samme innhold</h2></div>
        <div className="template-gallery">
          {templates.map((item, index) => <TemplatePoster key={item.id} item={item} index={index} onSelect={() => onSelectTemplate(item.id)} />)}
        </div>
        <button className="button button-outline centered" onClick={onOpen}>Utforsk alle malene <LayoutTemplate /></button>
      </section>
      <section className="final-cta">
        <span className="eyebrow light">Klar når du er</span>
        <h2>Du har erfaringen<br /><em>La den bli sett</em></h2>
        <button className="button button-signal button-large" onClick={onStartBlank}>Start med tom CV <ArrowRight /></button>
        <p>Ingen konto · Ingen kredittkort · CV lagres på din enhet</p>
      </section>
    </>
  )
}

function HeroDocument() {
  return (
    <motion.div className="hero-visual" initial={{ opacity: 0, rotate: 1.5, y: 30 }} animate={{ opacity: 1, rotate: -1.4, y: 0 }} transition={{ duration: .7, delay: .15 }}>
      <div className="hero-note"><Sparkles /> <strong>Godt førsteinntrykk</strong><span>Tydelig profil og målbare resultater.</span></div>
      <div className="paper-card">
        <div className="paper-side"><div className="paper-avatar" /><div className="paper-lines pale" /><div className="paper-lines pale short" /></div>
        <div className="paper-main">
          <span>KARI NORDMANN</span><h3>Prosjektkoordinator</h3><div className="paper-rule" />
          <h4>PROFIL</h4><div className="paper-lines" /><div className="paper-lines" /><div className="paper-lines short" />
          <h4>ERFARING</h4><b>Eksempel Digital AS</b><div className="paper-lines" /><div className="paper-lines" />
          <b>Sentrum Kundeservice AS</b><div className="paper-lines" /><div className="paper-lines short" />
        </div>
      </div>
    </motion.div>
  )
}

function EditorMockup() {
  return (
    <div className="editor-mockup">
      <div className="mock-toolbar"><span /><span /><span /><b>CVklar arbeidsbord</b></div>
      <div className="mock-body">
        <div className="mock-panel"><small>SEKSJONER</small>{['Profil', 'Erfaring', 'Utdanning', 'Kompetanse'].map((item, i) => <div className={i === 1 ? 'selected' : ''} key={item}><GripVertical />{item}</div>)}</div>
        <div className="mock-page"><div className="mock-photo" /><h3>Kari Nordmann</h3><p>Prosjektkoordinator</p><hr /><b>Profil</b><span /><span /><b>Erfaring</b><span /><span /><span /></div>
        <div className="mock-pop"><WandSparkles /> Klikk for å skrive</div>
      </div>
    </div>
  )
}

function TemplatePoster({ item, index, onSelect }: { item: typeof templates[number]; index: number; onSelect: () => void }) {
  return (
    <motion.button type="button" className={`template-poster poster-${item.id}`} onClick={onSelect} aria-label={`Velg malen ${item.name} og fortsett til redigering`} whileHover={{ y: -8 }} whileTap={{ scale: .99 }} transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
      <div className="poster-page"><aside style={{ background: item.color }} /><main><span /><h3>ELLA NORDMANN</h3><small>PROSJEKTLEDER</small><hr /><b>PROFIL</b><p /><p /><b>ERFARING</b><p /><p /><b>UTDANNING</b><p /></main></div>
      <div><span>0{index + 1}</span><h3>{item.name}</h3><p>{item.note}</p></div>
    </motion.button>
  )
}

function Builder({ cv, setCv, template, setTemplate, theme, setTheme }: { cv: CvData; setCv: (cv: CvData) => void; template: TemplateId; setTemplate: (id: TemplateId) => void; theme: ThemeId; setTheme: (id: ThemeId) => void }) {
  const [tab, setTab] = useState<BuilderTab>('innhold')
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState('')
  const [industry, setIndustry] = useState<Industry>('teknologi')
  const [jobText, setJobText] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionPlacement, setNewSectionPlacement] = useState<'main' | 'sidebar'>('sidebar')
  const [editingExperienceLogo, setEditingExperienceLogo] = useState<number | null>(null)
  const [editingProjectImage, setEditingProjectImage] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const experienceLogoRef = useRef<HTMLInputElement>(null)
  const projectImageRef = useRef<HTMLInputElement>(null)
  const findings = useMemo(() => analyzeCv(cv, industry, jobText), [cv, industry, jobText])

  // Normalisering skjer ved lasting av eldre dokumenter. Direkte redigering må
  // beholde mellomrom og midlertidig tomme felt mens brukeren skriver.
  const updateCv = (next: CvData) => setCv(next)

  const importFile = async (file?: File) => {
    if (!file) return
    setImporting(true)
    setNotice('Leser CV-en lokalt …')
    try {
      const text = await extractFileText(file)
      updateCv(parseResume(text, cv))
      setNotice('Ferdig! Kontroller feltene før du laster ned.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Filen kunne ikke leses.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const changePhoto = async (file?: File) => {
    if (!file) return
    try {
      const photo = await readImageFile(file, 880)
      updateCv({ ...cv, photo })
      setNotice('Profilbilde er oppdatert.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Bildet kunne ikke leses.')
    } finally {
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  const changeExperienceLogo = async (file?: File) => {
    if (!file || editingExperienceLogo === null) return
    try {
      const companyLogo = await readImageFile(file, 420)
      updateCv({
        ...cv,
        experience: cv.experience.map((entry, index) => (index === editingExperienceLogo ? { ...entry, companyLogo } : entry)),
      })
      setNotice('Bedriftslogoen er oppdatert.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Logoen kunne ikke leses.')
    } finally {
      setEditingExperienceLogo(null)
      if (experienceLogoRef.current) experienceLogoRef.current.value = ''
    }
  }

  const changeProjectImage = async (file?: File) => {
    if (!file || editingProjectImage === null) return
    try {
      const image = await readImageFile(file, 420)
      updateCv({
        ...cv,
        projects: cv.projects.map((entry, index) => (index === editingProjectImage ? { ...entry, image } : entry)),
      })
      setNotice('Prosjektbildet er oppdatert.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Prosjektbildet kunne ikke leses.')
    } finally {
      setEditingProjectImage(null)
      if (projectImageRef.current) projectImageRef.current.value = ''
    }
  }

  const exportPdf = async () => {
    if (isExporting) return
    setIsExporting(true)
    setNotice('Lager PDF …')
    try {
      const element = document.getElementById('cv-document')
      if (!element) throw new Error('Fant ikke CV-dokumentet.')
      await exportCvPdf(element, `${cv.name.replace(/[^a-zæøå0-9]+/gi, '_')}_CV.pdf`, cv)
      setNotice('PDF-en er lastet ned.')
    } catch {
      setNotice('PDF-en kunne ikke lages. Prøv på nytt.')
    } finally {
      setIsExporting(false)
    }
  }

  const move = <T,>(items: T[], index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return items
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  }

  const toggleSection = (id: string) => {
    if (id === 'references') {
      updateCv(applyReferencePlacement(cv, 'hidden'))
      return
    }
    const hiddenSections = cv.hiddenSections.includes(id)
      ? cv.hiddenSections.filter((section) => section !== id)
      : [...cv.hiddenSections, id]
    updateCv({ ...cv, hiddenSections })
  }

  const toggleContactField = (id: string) => {
    const hiddenContactFields = cv.hiddenContactFields.includes(id)
      ? cv.hiddenContactFields.filter((field) => field !== id)
      : [...cv.hiddenContactFields, id]
    updateCv({ ...cv, hiddenContactFields })
  }

  const moveSection = (placement: 'main' | 'sidebar', index: number, direction: -1 | 1) => {
    const key = placement === 'main' ? 'sectionOrder' : 'sidebarOrder'
    updateCv({ ...cv, [key]: move(cv[key], index, direction) })
  }

  const addCustomSection = (rawTitle: string, placement: 'main' | 'sidebar') => {
    const title = rawTitle.trim()
    if (!title) return
    const id = `custom-${newId('section')}`
    const customSections = [...cv.customSections, { id, title, placement, items: ['Klikk for å skrive'] }]
    const key = placement === 'main' ? 'sectionOrder' : 'sidebarOrder'
    updateCv({ ...cv, customSections, [key]: [...cv[key], id] })
    setNewSectionTitle('')
  }

  const removeCustomSection = (id: string) => updateCv({
    ...cv,
    customSections: cv.customSections.filter((section) => section.id !== id),
    sectionOrder: cv.sectionOrder.filter((section) => section !== id),
    sidebarOrder: cv.sidebarOrder.filter((section) => section !== id),
    hiddenSections: cv.hiddenSections.filter((section) => section !== id),
  })

  const sectionLabel = (id: string) => ({
    summary: 'Profil',
    experience: 'Erfaring',
    education: 'Utdanning',
    projects: 'Mine prosjekter',
    skills: 'Kompetanse nederst',
    contact: 'Kontakt',
    'side-skills': 'Kompetanse i sidefelt',
    languages: 'Språk',
    references: 'Referanser',
  }[id] ?? cv.customSections.find((section) => section.id === id)?.title ?? 'Egen seksjon')

  const setReferencePlacement = (placement: ReferencePlacement) => updateCv(applyReferencePlacement(cv, placement))

  const updateReference = (index: number, key: keyof Reference, value: string) => {
    updateCv({
      ...cv,
      references: cv.references.map((reference, itemIndex) => (itemIndex === index ? { ...reference, [key]: value } : reference)),
    })
  }

  const addProject = () => {
    const project: Project = {
      id: newId('project'),
      title: 'Nytt prosjekt',
      subtitle: '',
      period: '',
      description: 'Kort prosjektbeskrivelse',
      technologies: [],
      url: '',
      githubUrl: '',
      image: '',
    }
    const sectionOrder = cv.sectionOrder.includes('projects') ? cv.sectionOrder : [...cv.sectionOrder, 'projects']
    updateCv({
      ...cv,
      projects: [...cv.projects, project],
      sectionOrder,
      hiddenSections: cv.hiddenSections.filter((section) => section !== 'projects'),
    })
  }

  const updateProject = <K extends keyof Project>(index: number, key: K, value: Project[K]) => {
    updateCv({
      ...cv,
      projects: cv.projects.map((project, itemIndex) => (itemIndex === index ? { ...project, [key]: value } : project)),
    })
  }

  const updateExperience = (index: number, patch: Partial<CvData['experience'][number]>) => {
    updateCv({
      ...cv,
      experience: cv.experience.map((entry, itemIndex) => (itemIndex === index ? { ...entry, ...patch } : entry)),
    })
  }

  const addSkillGroup = () => {
    const group: SkillGroup = { id: newId('skill-group'), title: 'Programmeringsspråk', items: ['Java', 'Python'] }
    updateCv({
      ...cv,
      skillGroups: [...cv.skillGroups, group],
      hiddenSections: cv.hiddenSections.filter((section) => section !== 'side-skills'),
    })
  }

  const updateSkillGroup = (index: number, patch: Partial<SkillGroup>) => {
    updateCv({
      ...cv,
      skillGroups: cv.skillGroups.map((group, itemIndex) => (itemIndex === index ? { ...group, ...patch } : group)),
    })
  }

  return (
    <div className="builder-shell">
      <div className="builder-topbar">
        <div className="builder-progress"><span className="done">1</span><i /><span className="done">2</span><i /><span>3</span><small>Innhold&nbsp;&nbsp;&nbsp; Utseende&nbsp;&nbsp;&nbsp; Last ned</small></div>
        <button className="button button-small" onClick={exportPdf} disabled={isExporting}><Download /> {isExporting ? 'Lager PDF …' : 'Last ned PDF'}</button>
      </div>
      <div className="builder-layout">
        <aside className="builder-panel">
          <div className="builder-tabs">
            {([['innhold', <PenLine />, 'Innhold'], ['mal', <LayoutTemplate />, 'Maler'], ['ai', <Bot />, 'AI-råd']] as const).map(([id, icon, label]) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{icon}{label}</button>
            ))}
          </div>
          <div className="panel-scroll">
            {tab === 'innhold' && (
              <>
                <div className="panel-heading"><span>Dokument</span><h2>Innhold og rekkefølge</h2><p>Klikk også direkte i arket for å skrive.</p></div>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={(event) => importFile(event.target.files?.[0])} />
                <input ref={photoRef} type="file" accept={acceptedImageTypes} aria-label="Velg profilbilde" hidden onChange={(event) => changePhoto(event.target.files?.[0])} />
                <input ref={experienceLogoRef} type="file" accept={acceptedImageTypes} aria-label="Velg bedriftslogo" hidden onChange={(event) => changeExperienceLogo(event.target.files?.[0])} />
                <input ref={projectImageRef} type="file" accept={acceptedImageTypes} aria-label="Velg prosjektbilde" hidden onChange={(event) => changeProjectImage(event.target.files?.[0])} />

                <div className="start-choice" aria-label="Velg hvordan du vil starte">
                  <button onClick={() => {
                    if (window.confirm('Starte med en tom CV? Nåværende innhold erstattes i nettleseren.')) {
                      updateCv(cloneBlank())
                      setNotice('Tom CV er klar. Klikk direkte i dokumentet for å skrive.')
                    }
                  }}><PenLine /><span><b>Start fra scratch</b><small>Fyll ut selv, ingen fil nødvendig</small></span></button>
                  <button onClick={() => fileRef.current?.click()} disabled={importing}><UploadCloud /><span><b>{importing ? 'Leser filen …' : 'Importer CV'}</b><small>Valgfritt · PDF, DOCX eller TXT</small></span></button>
                </div>
                <div className="optional-note"><Check /> Opplasting er helt valgfritt. Alle felt kan skrives og redigeres direkte.</div>
                {notice && <div className="notice" role="status">{notice}</div>}

                <button className="panel-action" onClick={() => photoRef.current?.click()}><ImagePlus /> Bytt profilbilde</button>

                <div className="panel-section competency-editor-section">
                  <div className="panel-section-head"><h3>Kompetanse</h3><button onClick={addSkillGroup}><Plus /> Ny underoverskrift</button></div>
                  <p className="section-help">Lag kategorier som «Programmeringsspråk» og «Backend/Frameworks». Hver kategori vises med egne punkter i sidefeltet.</p>
                  <div className="list-editor competency-flat-list">
                    <div><b>Uten underoverskrift</b><button onClick={() => updateCv({ ...cv, skills: [...cv.skills, 'Ny kompetanse'] })}><Plus /> Ny rad</button></div>
                    {cv.skills.map((item, index) => (
                      <span key={`skills-${index}`}>
                        <input aria-label={`Kompetanse uten underoverskrift ${index + 1}`} value={item} onChange={(event) => updateCv({ ...cv, skills: cv.skills.map((value, itemIndex) => itemIndex === index ? event.target.value : value) })} />
                        <button onClick={() => updateCv({ ...cv, skills: cv.skills.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Slett kompetanse ${index + 1}`}><X /></button>
                      </span>
                    ))}
                  </div>
                  <div className="skill-group-editor">
                    <div className="skill-group-editor-head"><div><b>Underoverskrifter med punktliste</b><small>Legg til så mange kategorier og ferdigheter du trenger.</small></div></div>
                    {cv.skillGroups.length === 0 && <p className="skill-group-empty">Ingen underoverskrifter ennå.</p>}
                    {cv.skillGroups.map((group, groupIndex) => (
                      <article key={group.id}>
                        <div className="skill-group-title">
                          <label>Underoverskrift<input aria-label={`Underoverskrift ${groupIndex + 1}`} value={group.title} onChange={(event) => updateSkillGroup(groupIndex, { title: event.target.value })} /></label>
                          <span>
                            <button onClick={() => updateCv({ ...cv, skillGroups: move(cv.skillGroups, groupIndex, -1) })} aria-label={`Flytt kompetansegruppe ${groupIndex + 1} opp`}>↑</button>
                            <button onClick={() => updateCv({ ...cv, skillGroups: move(cv.skillGroups, groupIndex, 1) })} aria-label={`Flytt kompetansegruppe ${groupIndex + 1} ned`}>↓</button>
                            <button onClick={() => updateCv({ ...cv, skillGroups: cv.skillGroups.filter((item) => item.id !== group.id) })} aria-label={`Slett kompetansegruppe ${groupIndex + 1}`}><Trash2 /></button>
                          </span>
                        </div>
                        <div className="skill-group-items">
                          {group.items.map((item, itemIndex) => (
                            <div key={`${group.id}-${itemIndex}`}>
                              <input aria-label={`${group.title || 'Kompetansegruppe'} punkt ${itemIndex + 1}`} value={item} onChange={(event) => updateSkillGroup(groupIndex, { items: group.items.map((value, index) => index === itemIndex ? event.target.value : value) })} />
                              <button onClick={() => updateSkillGroup(groupIndex, { items: group.items.filter((_, index) => index !== itemIndex) })} aria-label={`Slett punkt ${itemIndex + 1} fra ${group.title || 'kompetansegruppe'}`}><X /></button>
                            </div>
                          ))}
                          <button className="add-skill-row" onClick={() => updateSkillGroup(groupIndex, { items: [...group.items, 'Ny kompetanse'] })}><Plus /> Ny ferdighet</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="panel-section">
                  <div className="panel-section-head"><h3>Erfaring</h3><button onClick={() => updateCv({ ...cv, experience: [...cv.experience, { id: newId('exp'), role: 'Ny stilling', company: 'Arbeidsgiver', period: 'År til år', bullets: ['Beskriv et konkret ansvar eller resultat.'], companyLogo: '' }] })}><Plus /> Legg til</button></div>
                  <div className="reorder-list">
                    {cv.experience.map((entry, index) => (
                      <article className="experience-editor-card" key={entry.id}>
                        <GripVertical />
                        {entry.companyLogo && <img className="editor-item-image" src={entry.companyLogo} alt="" aria-hidden="true" />}
                        <div>
                          <b>{entry.role}</b><small>{entry.company}</small>
                          <div className="editor-media-actions">
                            <button onClick={() => { setEditingExperienceLogo(index); experienceLogoRef.current?.click() }}><ImagePlus /> {entry.companyLogo ? 'Bytt logo' : 'Bedriftslogo (valgfritt)'}</button>
                            {entry.companyLogo && <button onClick={() => updateCv({ ...cv, experience: cv.experience.map((item, itemIndex) => itemIndex === index ? { ...item, companyLogo: '' } : item) })}><X /> Fjern</button>}
                          </div>
                          <div className="experience-fields">
                            <label>Stillingstittel<input value={entry.role} onChange={(event) => updateExperience(index, { role: event.target.value })} /></label>
                            <label>Arbeidsgiver<input value={entry.company} onChange={(event) => updateExperience(index, { company: event.target.value })} /></label>
                            <label className="field-wide">Periode<input value={entry.period} onChange={(event) => updateExperience(index, { period: event.target.value })} /></label>
                            <div className="bullet-editor field-wide">
                              <div><b>Punktvis forklaring</b><button onClick={() => updateExperience(index, { bullets: [...entry.bullets, 'Nytt ansvar eller resultat'] })}><Plus /> Nytt punkt</button></div>
                              {entry.bullets.map((bullet, bulletIndex) => (
                                <div className="bullet-row" key={`${entry.id}-editor-bullet-${bulletIndex}`}>
                                  <textarea aria-label={`Erfaringspunkt ${bulletIndex + 1}`} rows={2} value={bullet} onChange={(event) => updateExperience(index, { bullets: entry.bullets.map((item, itemIndex) => itemIndex === bulletIndex ? event.target.value : item) })} />
                                  <button onClick={() => updateExperience(index, { bullets: entry.bullets.filter((_, itemIndex) => itemIndex !== bulletIndex) })} aria-label={`Slett erfaringspunkt ${bulletIndex + 1}`}><X /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <span>
                          <button onClick={() => updateCv({ ...cv, experience: move(cv.experience, index, -1) })} aria-label="Flytt opp">↑</button>
                          <button onClick={() => updateCv({ ...cv, experience: move(cv.experience, index, 1) })} aria-label="Flytt ned">↓</button>
                          <button onClick={() => updateCv({ ...cv, experience: cv.experience.filter((item) => item.id !== entry.id) })} aria-label="Slett erfaring"><Trash2 /></button>
                        </span>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="panel-section">
                  <div className="panel-section-head"><h3>Utdanning</h3><button onClick={() => updateCv({ ...cv, education: [...cv.education, { id: newId('edu'), degree: 'Ny utdanning', school: 'Skole eller studiested', period: 'År til år' }] })}><Plus /> Legg til</button></div>
                  <div className="reorder-list">
                    {cv.education.map((entry, index) => (
                      <article key={entry.id}>
                        <GripVertical /><div><b>{entry.degree}</b><small>{entry.school}</small></div>
                        <span><button onClick={() => updateCv({ ...cv, education: move(cv.education, index, -1) })} aria-label="Flytt utdanning opp">↑</button><button onClick={() => updateCv({ ...cv, education: move(cv.education, index, 1) })} aria-label="Flytt utdanning ned">↓</button><button onClick={() => updateCv({ ...cv, education: cv.education.filter((item) => item.id !== entry.id) })} aria-label="Slett utdanning"><Trash2 /></button></span>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="panel-section">
                  <div className="panel-section-head"><h3>Mine prosjekter</h3><button onClick={addProject}><Plus /> Legg til</button></div>
                  <div className="reorder-list">
                    {cv.projects.map((entry, index) => (
                      <article className="project-editor-card" key={entry.id}>
                        <GripVertical />
                        {entry.image && <img className="editor-item-image" src={entry.image} alt="" aria-hidden="true" />}
                        <div>
                          <b>{entry.title || 'Uten navn'}</b><small>{entry.subtitle || 'Kort undertittel'}</small>
                          <div className="editor-media-actions">
                            <button onClick={() => { setEditingProjectImage(index); projectImageRef.current?.click() }}><ImagePlus /> {entry.image ? 'Bytt bilde' : 'Prosjektbilde (valgfritt)'}</button>
                            {entry.image && <button onClick={() => updateProject(index, 'image', '')}><X /> Fjern</button>}
                          </div>
                          <div className="project-fields">
                            <label>Prosjektnavn<input value={entry.title} onChange={(event) => updateProject(index, 'title', event.target.value)} /></label>
                            <label>Rolle / undertittel<input value={entry.subtitle ?? ''} onChange={(event) => updateProject(index, 'subtitle', event.target.value)} /></label>
                            <label>Periode<input value={entry.period ?? ''} onChange={(event) => updateProject(index, 'period', event.target.value)} /></label>
                            <label className="field-wide">Kort beskrivelse<textarea rows={3} value={entry.description ?? ''} onChange={(event) => updateProject(index, 'description', event.target.value)} /></label>
                            <label className="field-wide">Teknologier <small>Skill med komma eller ·</small><input value={(entry.technologies ?? []).join(' · ')} onChange={(event) => updateProject(index, 'technologies', event.target.value.split(/[,·]/).map((item) => item.trim()))} /></label>
                            <label>Prosjektlenke<input type="url" value={entry.url ?? ''} onChange={(event) => updateProject(index, 'url', event.target.value)} placeholder="https://…" /></label>
                            <label>GitHub-lenke<input type="url" value={entry.githubUrl ?? ''} onChange={(event) => updateProject(index, 'githubUrl', event.target.value)} placeholder="https://github.com/…" /></label>
                          </div>
                        </div>
                        <span>
                          <button onClick={() => updateCv({ ...cv, projects: move(cv.projects, index, -1) })} aria-label="Flytt prosjekt opp">↑</button>
                          <button onClick={() => updateCv({ ...cv, projects: move(cv.projects, index, 1) })} aria-label="Flytt prosjekt ned">↓</button>
                          <button onClick={() => updateCv({ ...cv, projects: cv.projects.filter((item) => item.id !== entry.id) })} aria-label="Slett prosjekt"><Trash2 /></button>
                        </span>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="panel-section">
                  <h3>Referanser</h3>
                  <div className="reference-placement" role="radiogroup" aria-label="Plassering av referanser">
                    {([
                      ['hidden', 'Skjult'],
                      ['sidebar', 'Sidefelt'],
                      ['main', 'Hovedfelt'],
                    ] as const).map(([value, label]) => (
                      <label key={value}>
                        <input type="radio" name="referencePlacement" checked={cv.referencePlacement === value} onChange={() => setReferencePlacement(value as ReferencePlacement)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="list-editor">
                    <div><b>Referansepersoner</b><button onClick={() => updateCv({ ...cv, references: [...cv.references, { id: newId('ref'), text: 'Oppgis på forespørsel' }] })}><Plus /> Ny referanse</button></div>
                    {cv.references.map((reference, index) => (
                      <span key={reference.id}>
                        <small>{reference.name || reference.text || `Referanse ${index + 1}`}</small>
                        <button onClick={() => updateCv({ ...cv, references: cv.references.filter((item) => item.id !== reference.id) })} aria-label={`Slett referanse ${index + 1}`}><X /></button>
                      </span>
                    ))}
                  </div>
                  {cv.references.map((reference, index) => (
                    <div className="reference-fields" key={`${reference.id}-fields`}>
                      <strong>Referanse {index + 1}</strong>
                      <label>Navn<input value={reference.name ?? ''} onChange={(event) => updateReference(index, 'name', event.target.value)} /></label>
                      <label>Rolle<input value={reference.role ?? ''} onChange={(event) => updateReference(index, 'role', event.target.value)} /></label>
                      <label>Bedrift<input value={reference.company ?? ''} onChange={(event) => updateReference(index, 'company', event.target.value)} /></label>
                      <label>Telefon<input value={reference.phone ?? ''} onChange={(event) => updateReference(index, 'phone', event.target.value)} /></label>
                      <label>E-post<input type="email" value={reference.email ?? ''} onChange={(event) => updateReference(index, 'email', event.target.value)} /></label>
                      <label className="field-wide">Fritekst <small>For eksempel «Oppgis på forespørsel»</small><input value={reference.text ?? ''} onChange={(event) => updateReference(index, 'text', event.target.value)} /></label>
                    </div>
                  ))}
                </div>

                <div className="panel-section">
                  <h3>Hovedfelt</h3>
                  <p className="section-help">Velg hva som skal vises i hoveddelen og endre rekkefølgen</p>
                  <div className="section-manager">{cv.sectionOrder.map((section, index) => <div key={section}><label><input type="checkbox" checked={!cv.hiddenSections.includes(section)} onChange={() => toggleSection(section)} /><span>{sectionLabel(section)}</span></label><span><button onClick={() => moveSection('main', index, -1)} aria-label={`Flytt ${sectionLabel(section)} opp`}>↑</button><button onClick={() => moveSection('main', index, 1)} aria-label={`Flytt ${sectionLabel(section)} ned`}>↓</button>{section.startsWith('custom-') && <button onClick={() => removeCustomSection(section)} aria-label={`Slett ${sectionLabel(section)}`}><Trash2 /></button>}</span></div>)}</div>
                </div>

                <div className="panel-section">
                  <h3>Sidefelt</h3>
                  <p className="section-help">Kontakt, lister og egne rekker langs siden</p>
                  <div className="section-manager">{cv.sidebarOrder.map((section, index) => <div key={section}><label><input type="checkbox" checked={!cv.hiddenSections.includes(section)} onChange={() => toggleSection(section)} /><span>{sectionLabel(section)}</span></label><span><button onClick={() => moveSection('sidebar', index, -1)} aria-label={`Flytt ${sectionLabel(section)} opp`}>↑</button><button onClick={() => moveSection('sidebar', index, 1)} aria-label={`Flytt ${sectionLabel(section)} ned`}>↓</button>{section.startsWith('custom-') && <button onClick={() => removeCustomSection(section)} aria-label={`Slett ${sectionLabel(section)}`}><Trash2 /></button>}</span></div>)}</div>
                  <div className="contact-options"><b>Felter i Kontakt</b>{([['email', 'E-post'], ['phone', 'Telefon'], ['location', 'Sted'], ['website', 'Nettside eller LinkedIn']] as const).map(([id, label]) => <label key={id}><input type="checkbox" checked={!cv.hiddenContactFields.includes(id)} onChange={() => toggleContactField(id)} />{label}</label>)}</div>
                </div>

                <div className="panel-section">
                  <h3>Rader og innhold</h3>
                  <div className="list-editor"><div><b>Språk</b><button onClick={() => updateCv({ ...cv, languages: [...cv.languages, 'Nytt språk og nivå'] })}><Plus /> Ny rad</button></div>{cv.languages.map((item, index) => <span key={`languages-${index}`}><small>{item}</small><button onClick={() => updateCv({ ...cv, languages: cv.languages.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Slett språk ${index + 1}`}><X /></button></span>)}</div>
                  {cv.customSections.map((section) => <div className="list-editor" key={section.id}><div><b>{section.title} <small>{section.placement === 'sidebar' ? 'Sidefelt' : 'Hovedfelt'}</small></b><button onClick={() => updateCv({ ...cv, customSections: cv.customSections.map((item) => item.id === section.id ? { ...item, items: [...item.items, 'Ny rad'] } : item) })}><Plus /> Ny rad</button></div>{section.items.map((item, index) => <span key={`${section.id}-${index}`}><small>{item}</small><button onClick={() => updateCv({ ...cv, customSections: cv.customSections.map((entry) => entry.id === section.id ? { ...entry, items: entry.items.filter((_, itemIndex) => itemIndex !== index) } : entry) })} aria-label={`Slett rad ${index + 1} fra ${section.title}`}><X /></button></span>)}</div>)}
                </div>

                <div className="panel-section">
                  <h3>Ny seksjon</h3>
                  <div className="new-section-form"><input value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="For eksempel kurs" /><select value={newSectionPlacement} onChange={(event) => setNewSectionPlacement(event.target.value as 'main' | 'sidebar')}><option value="sidebar">Sidefelt</option><option value="main">Hovedfelt</option></select><button onClick={() => addCustomSection(newSectionTitle, newSectionPlacement)} disabled={!newSectionTitle.trim()}><Plus /> Legg til</button></div>
                  <div className="section-suggestions"><small>Forslag</small>{['Kurs', 'Sertifiseringer', 'Prosjekter', 'Frivillig arbeid', 'Førerkort', 'Publikasjoner'].map((title) => <button key={title} onClick={() => addCustomSection(title, newSectionPlacement)}>{title}</button>)}</div>
                </div>

                <button className="reset-button" onClick={() => { updateCv(cloneDefault()); setNotice('Eksempelinnholdet er gjenopprettet.') }}><RotateCcw /> Gjenopprett eksempel</button>
              </>
            )}

            {tab === 'mal' && (
              <>
                <div className="panel-heading"><span>Utseende</span><h2>Velg en mal</h2><p>Innholdet ditt beholdes når du bytter.</p></div>
                <div className="template-picker">
                  {templates.map((item) => <button key={item.id} className={template === item.id ? 'selected' : ''} onClick={() => setTemplate(item.id)}><span className={`mini-template mini-${item.id}`}><i style={{ background: item.color }} /><b /></span><strong>{item.name}</strong><small>{item.note}</small>{template === item.id && <Check />}</button>)}
                </div>
                <div className="theme-heading"><h3>Fargetema</h3><p>Fargen endrer uttrykket, ikke innholdet.</p></div>
                <div className="theme-picker">
                  {colorThemes.map((item) => <button key={item.id} className={theme === item.id ? 'selected' : ''} onClick={() => setTheme(item.id)} aria-label={`Velg fargetema ${item.name}`}><span style={{ background: item.sidebar }} /><i style={{ background: item.accent }} /><b style={{ background: item.highlight }} />{item.name}{theme === item.id && <Check />}</button>)}
                </div>

                <div className="panel-section">
                  <h3>Typografi og avstand</h3>
                  <p className="section-help">CV-standard: Body 10.5 pt · Overskrift 14 pt · Navn 22 pt · Metadata 9.5 pt · Linjeavstand 1.1 · Marg 20 mm</p>
                  <label className="field-label">Skriftstørrelse
                    <select value={cv.appearance.typeScale} onChange={(event) => updateCv({ ...cv, appearance: { ...cv.appearance, typeScale: event.target.value as TypeScaleId } })}>
                      {Object.entries(typeScales).map(([id, scale]) => <option key={id} value={id}>{scale.label} · {scale.note}</option>)}
                    </select>
                  </label>
                  <label className="field-label">Avstand
                    <select value={cv.appearance.spaceScale} onChange={(event) => updateCv({ ...cv, appearance: { ...cv.appearance, spaceScale: event.target.value as SpaceScaleId } })}>
                      {Object.entries(spaceScales).map(([id, scale]) => <option key={id} value={id}>{scale.label} · {scale.note}</option>)}
                    </select>
                  </label>
                  <label className="field-label">Sidemarg ({marginRange.min}-{marginRange.max} mm)
                    <input type="range" min={marginRange.min} max={marginRange.max} value={cv.appearance.margin} onChange={(event) => updateCv({ ...cv, appearance: { ...cv.appearance, margin: Number(event.target.value) } })} />
                    <small>{cv.appearance.margin} mm</small>
                  </label>
                </div>

                <div className="template-sources"><b>Standardmaler og kilder</b>{templates.filter((item) => item.sourceUrl).map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.id}>{item.name}<small>{item.source}</small></a>)}</div>
              </>
            )}

            {tab === 'ai' && (
              <>
                <div className="panel-heading"><span>Ansettbar AI</span><h2>Hva kan løfte CV-en?</h2><p>Lokal analyse basert på valgt bransje og NAVs råd.</p></div>
                <label className="field-label">Bransje<select value={industry} onChange={(event) => setIndustry(event.target.value as Industry)}>{Object.entries(industryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                <label className="field-label">Stillingsannonse<textarea rows={6} value={jobText} onChange={(event) => setJobText(event.target.value.slice(0, 8000))} placeholder="Lim inn teksten fra annonsen for mer målrettede råd …" /><small>{jobText.length}/8000</small></label>
                <div className="ai-disclaimer"><ShieldCheck /> Analysen kjører på enheten din. Ingen tekst sendes til en AI-tjeneste.</div>
                <div className="finding-list">{findings.map((finding) => <article className={`finding ${finding.level}`} key={finding.title}><span>{finding.level === 'sterk' ? <Check /> : <Sparkles />}</span><div><b>{finding.title}</b><p>{finding.detail}</p></div></article>)}</div>
                <div className="source-box"><b>Kildegrunnlag</b><a href={industrySources[industry].url} target="_blank" rel="noreferrer">Bransjekilde: {industrySources[industry].title}<small>Sjekket {industrySources[industry].checked}</small></a>{navSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<small>Sjekket {source.checked}</small></a>)}<p>Rådene er veiledning, ikke en garanti for intervju eller jobb.</p></div>
              </>
            )}
          </div>
        </aside>
        <section className="preview-stage">
          <div className="preview-label"><Eye /> Direkte forhåndsvisning <span>Klikk på tekst for å redigere</span></div>
          <div className="cv-scale"><CvPreview data={cv} template={template} theme={theme} onChange={updateCv} /></div>
        </section>
      </div>
    </div>
  )
}

function Guide({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState(0)
  const items = [
    ['Start med jobben, ikke med historikken din', 'Les annonsen og marker oppgaver, krav og ord som går igjen. Prioriter så erfaringen som beviser at du kan løse akkurat disse oppgavene.'],
    ['Skriv en tydelig profil', 'Bruk 3 til 5 linjer: hvem du er faglig, hva du kan bidra med, og hvilken type rolle du sikter mot. Unngå generelle adjektiver uten eksempler.'],
    ['Vis effekt, ikke bare ansvar', 'Bytt «ansvarlig for» med et aktivt verb og resultat: hva gjorde du, i hvilket omfang, og hva ble bedre? Tall hjelper når de er sanne og relevante.'],
    ['Gjør CV-en lett å skumme', 'Nyeste erfaring først, korte avsnitt, konsekvente datoer og tydelige seksjoner. To til fire punkter per rolle er ofte nok.'],
    ['Tilpass søknadsbrevet', 'Svar direkte på annonsen, bruk konkrete eksempler og hold teksten kort. NAV anbefaler en målrettet søknad på helst ikke mer enn én side.'],
  ]
  return (
    <div className="guide-page">
      <section className="guide-hero"><span className="eyebrow">CV-guiden · oppdatert juli 2026</span><h1>En god CV er ikke hele historien<br /><em>Det er riktig utdrag</em></h1><p>En kort, norsk veiledning basert på råd fra NAV og Arbeidsplassen.</p></section>
      <div className="guide-layout section-wrap">
        <aside><span>HUSKEREGEL</span><strong>Relevant.<br />Konkret.<br />Lettlest.</strong><p>Arbeidsgiveren skal raskt forstå hva du kan bidra med.</p><button className="button" onClick={onStart}>Bruk rådene nå <ArrowRight /></button></aside>
        <section className="accordion-list">
          {items.map(([title, text], index) => <article className={open === index ? 'open' : ''} key={title}><button onClick={() => setOpen(open === index ? -1 : index)}><span>0{index + 1}</span><h2>{title}</h2><ChevronDown /></button><AnimatePresence>{open === index && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{text}</motion.p>}</AnimatePresence></article>)}
          <div className="guide-sources"><h3>Kilder og åpenhet</h3>{navSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} <ArrowRight /></a>)}<p>Bransjeråd i coachen er heuristikker som hjelper deg å stille bedre spørsmål til eget innhold. Kontroller alltid kravene i den konkrete stillingsannonsen.</p></div>
        </section>
      </div>
    </div>
  )
}

function Footer({ navigate, setLegal }: { navigate: (view: View) => void; setLegal: (type: Legal) => void }) {
  return (
    <footer className="site-footer"><div className="footer-brand"><span className="brand-mark">ck</span><strong>CVklar</strong><p>Et enkelt arbeidsbord for CV, stillinger og søknad laget for Norge.</p></div><div><b>Verktøy</b><button onClick={() => navigate('builder')}>Lag CV</button><button onClick={() => navigate('jobs')}>Stillinger</button><button onClick={() => navigate('letter')}>Søknadsbrev</button><button onClick={() => navigate('guide')}>CV-guiden</button></div><div><b>Trygghet</b><button onClick={() => setLegal('privacy')}>Personvern</button><button onClick={() => setLegal('terms')}>Vilkår</button><a href="mailto:hei@cvklar.no">Kontakt</a></div><div className="footer-status"><ShieldCheck /><span><b>Local-first arbeidsbord</b><small>Dokumenter og stillingsliste lagres lokalt. Import og valgte AI-handlinger behandles på server.</small></span></div><div className="footer-bottom"><span>© 2026 CVklar</span><span>Utformet i Bergen · Bokmål</span></div></footer>
  )
}

function LegalModal({ type, onClose }: { type: Legal; onClose: () => void }) {
  if (!type) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.section className="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Lukk"><X /></button>
        {type === 'privacy' ? <><span className="eyebrow">Sist oppdatert 16. august 2026</span><h2 id="legal-title">Personvernerklæring</h2><p><strong>Kortversjonen:</strong> CV, profilbilde, lagrede stillinger og søknadsbrev lagres i nettleserens lokale lagring. CVklar har ingen konto eller database for disse dokumentene. URL-import og AI-funksjoner er valgfrie og krever serverbehandling.</p><h3>Hva lagres lokalt?</h3><p>CV-data, stillingsoversikt, søknadsstatus, søknadsdatoer og søknadsbrev lagres i localStorage slik at arbeidet ikke forsvinner ved oppdatering. Du kan fjerne dette ved å slette elementene i appen eller tømme nettleserdata.</p><h3>Import av stillinger</h3><p>Når du henter en annonse fra en URL, sendes URL-en til CVklar-serveren. Serveren henter siden, trekker ut ren tekst og returnerer strukturerte stillingsdata. Hvis modellbasert uttrekk er konfigurert, sendes den rensede annonseteksten til AI-tjenesten for strukturering. Hentet HTML kjøres ikke i nettleseren og stillingen lagres ikke i en CVklar-database.</p><h3>Valgfrie AI-funksjoner</h3><p>Når du aktivt bruker en AI-knapp, sendes relevant annonseinnhold og en sanitert kandidatprofil til den konfigurerte AI-tjenesten. Telefonnummer, e-post, bosted, profilbilde og annen kontaktinformasjon utelates. Den lokale CV-coachen og lokalt førsteutkast kan brukes uten denne overføringen.</p><h3>Filer og PDF</h3><p>Opplastede CV-filer leses i nettleseren og sendes ikke til CVklar. PDF genereres lokalt. Profilbilder lagres som en lokal dataadresse.</p><h3>Google-annonser og samtykke</h3><p>Når markedsføringssamtykke er gitt og AdSense er konfigurert, kan Google plassere eller lese informasjonskapsler, bruke IP-adresse og behandle bruksdata for annonselevering og måling. Før aktivering i Norge skal Google Privacy &amp; messaging eller en annen Google-sertifisert CMP være aktivert.</p><h3>Dine rettigheter</h3><p>Lokale dokumenter kontrolleres av deg i nettleseren. Data som behandles av eksterne tjenester håndteres etter deres vilkår og dine samtykkevalg.</p><p className="legal-warning">Dette er et produktutkast, ikke juridisk rådgivning. Legg inn korrekt behandlingsansvarlig, organisasjonsnummer, leverandørliste og kontaktpunkt før kommersiell publisering.</p></> : <><span className="eyebrow">Sist oppdatert 16. august 2026</span><h2 id="legal-title">Brukervilkår</h2><p>CVklar er et skrive-, organiserings- og formateringsverktøy. Du har ansvar for at innholdet du bruker er riktig, lovlig og ditt eget.</p><h3>Stillingsimport</h3><p>Automatisk import kan være ufullstendig eller slutte å fungere når en annonseside endres eller blokkerer tilgang. Kontroller alltid opplysninger og frister mot originalannonsen.</p><h3>AI-råd og utkast</h3><p>Råd og tekstutkast er veiledende og gir ingen garanti for intervju, ansettelse eller et bestemt resultat. Kontroller alltid fakta og tilpass språket før innsending. Ikke bruk forslag som tillegger deg erfaring du ikke har.</p><h3>Tilgjengelighet</h3><p>Tjenesten leveres slik den er. Vi forsøker å gjøre lokal lagring og PDF-eksport pålitelig, men du bør beholde en egen kopi av viktige dokumenter.</p><h3>Akseptabel bruk</h3><p>Ikke bruk tjenesten til å laste opp skadevare, krenke andres rettigheter, utgi deg for å være noen andre eller automatisere misbruk.</p><h3>Reklame</h3><p>Google AdSense-annonser merkes tydelig og påvirker ikke rådene i CV-coachen. Ikke klikk annonser for å støtte tjenesten eller bruk automatiserte klikk.</p><p className="legal-warning">Før kommersiell lansering må vilkårene kvalitetssikres for faktisk foretaksinformasjon, leverandører, betalingsmodell og valgt jurisdiksjon.</p></>}
      </motion.section>
    </div>
  )
}

function ConsentBanner({ onChoice }: { onChoice: (value: string) => void }) {
  return <div className="consent-banner"><div><ShieldCheck /><span><b>Personvern først</b><p>Nødvendig lokal lagring holder CV-en din på enheten. Google-annonser er avslått til du tillater markedsføring.</p></span></div><div><button className="button button-outline" onClick={() => onChoice('necessary')}>Kun nødvendig</button><button className="button" onClick={() => onChoice('accepted')}>Tillat markedsføring</button></div></div>
}

export default App
