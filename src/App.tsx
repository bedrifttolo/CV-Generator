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
import { blankCv, colorThemes, defaultCv, industryLabels, industrySources, navSources, templates } from './data'
import { analyzeCv, analyzeLetterFit, makeLetter } from './lib/coach'
import { extractFileText, parseResume } from './lib/parser'
import type { CvData, Industry, TemplateId, ThemeId } from './types'

type View = 'home' | 'builder' | 'guide' | 'letter'
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
    const fallback = cloneDefault()
    return {
      ...fallback,
      ...parsed,
      references: parsed.references ?? fallback.references,
      customSections: parsed.customSections ?? fallback.customSections,
      hiddenSections: parsed.hiddenSections ?? fallback.hiddenSections,
      hiddenContactFields: parsed.hiddenContactFields ?? fallback.hiddenContactFields,
      sidebarOrder: (parsed.sidebarOrder ?? fallback.sidebarOrder).map((id) => id === 'skills' ? 'side-skills' : id),
      sectionOrder: parsed.sectionOrder ?? fallback.sectionOrder,
    }
  } catch {
    return cloneDefault()
  }
}

function App() {
  const [view, setView] = useState<View>('home')
  const [cv, setCv] = useState<CvData>(loadCv)
  const [template, setTemplate] = useState<TemplateId>(() => (localStorage.getItem('cvklar-template') as TemplateId) || 'nordlys')
  const [theme, setTheme] = useState<ThemeId>(() => (localStorage.getItem('cvklar-theme') as ThemeId) || 'skog')
  const [legal, setLegal] = useState<Legal>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [consent, setConsent] = useState(() => localStorage.getItem('cvklar-consent'))

  useEffect(() => {
    localStorage.setItem('cvklar-document', JSON.stringify(cv))
  }, [cv])

  useEffect(() => {
    localStorage.setItem('cvklar-template', template)
    localStorage.setItem('cvklar-theme', theme)
  }, [template, theme])

  const navigate = (next: View) => {
    setView(next)
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
          {view === 'guide' && <Guide onStart={startBlank} />}
          {view === 'letter' && <LetterStudio cv={cv} />}
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
  const items: Array<[View, string]> = [['builder', 'Lag CV'], ['letter', 'Søknadsbrev'], ['guide', 'CV-guiden']]
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
        <span className="privacy-pill"><ShieldCheck size={15} /> Lokal og privat</span>
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
            <span><Check size={14} /> Data blir på enheten</span>
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
        <p>Ingen konto · Ingen kredittkort · Data på din enhet</p>
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
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const findings = useMemo(() => analyzeCv(cv, industry, jobText), [cv, industry, jobText])

  const importFile = async (file?: File) => {
    if (!file) return
    setImporting(true)
    setNotice('Leser CV-en lokalt …')
    try {
      const text = await extractFileText(file)
      setCv(parseResume(text, cv))
      setNotice('Ferdig! Kontroller de markerte feltene før du laster ned.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Filen kunne ikke leses.')
    } finally {
      setImporting(false)
    }
  }

  const changePhoto = (file?: File) => {
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setNotice('Velg et JPG-, PNG- eller WebP-bilde under 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setCv({ ...cv, photo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  const exportPdf = async () => {
    if (isExporting) return
    setIsExporting(true)
    setNotice('Lager PDF …')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const element = document.getElementById('cv-document')
      if (!element) throw new Error('Fant ikke dokumentet.')
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pageWidth = 210
      const pageHeight = 297
      const imageHeight = canvas.height * pageWidth / canvas.width
      const image = canvas.toDataURL('image/jpeg', .94)
      let offset = 0
      pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imageHeight)
      while (imageHeight + offset > pageHeight) {
        offset -= pageHeight
        pdf.addPage()
        pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imageHeight)
      }
      pdf.save(`${cv.name.replace(/[^a-zæøå0-9]+/gi, '_')}_CV.pdf`)
      setNotice('PDF-en er lastet ned.')
    } catch {
      setNotice('PDF-en kunne ikke lages. Prøv utskrift til PDF i nettleseren.')
    } finally {
      setIsExporting(false)
    }
  }

  const moveExperience = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= cv.experience.length) return
    const next = [...cv.experience]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCv({ ...cv, experience: next })
  }

  const moveEducation = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= cv.education.length) return
    const next = [...cv.education]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCv({ ...cv, education: next })
  }

  const toggleSection = (id: string) => {
    const hiddenSections = cv.hiddenSections.includes(id)
      ? cv.hiddenSections.filter((section) => section !== id)
      : [...cv.hiddenSections, id]
    setCv({ ...cv, hiddenSections })
  }

  const toggleContactField = (id: string) => {
    const hiddenContactFields = cv.hiddenContactFields.includes(id)
      ? cv.hiddenContactFields.filter((field) => field !== id)
      : [...cv.hiddenContactFields, id]
    setCv({ ...cv, hiddenContactFields })
  }

  const moveSection = (placement: 'main' | 'sidebar', index: number, direction: -1 | 1) => {
    const key = placement === 'main' ? 'sectionOrder' : 'sidebarOrder'
    const order = [...cv[key]]
    const target = index + direction
    if (target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    setCv({ ...cv, [key]: order })
  }

  const addCustomSection = (rawTitle: string, placement: 'main' | 'sidebar') => {
    const title = rawTitle.trim()
    if (!title) return
    const id = `custom-${crypto.randomUUID()}`
    const customSections = [...cv.customSections, { id, title, placement, items: ['Klikk for å skrive'] }]
    const key = placement === 'main' ? 'sectionOrder' : 'sidebarOrder'
    setCv({ ...cv, customSections, [key]: [...cv[key], id] })
    setNewSectionTitle('')
  }

  const removeCustomSection = (id: string) => setCv({
    ...cv,
    customSections: cv.customSections.filter((section) => section.id !== id),
    sectionOrder: cv.sectionOrder.filter((section) => section !== id),
    sidebarOrder: cv.sidebarOrder.filter((section) => section !== id),
    hiddenSections: cv.hiddenSections.filter((section) => section !== id),
  })

  const updateList = (key: 'skills' | 'languages' | 'references', next: string[]) => setCv({ ...cv, [key]: next })
  const sectionLabel = (id: string) => ({
    summary: 'Profil',
    experience: 'Erfaring',
    education: 'Utdanning',
    skills: 'Kompetanse nederst',
    contact: 'Kontakt',
    'side-skills': 'Kompetanse i sidefelt',
    languages: 'Språk',
    references: 'Referanser',
  }[id] ?? cv.customSections.find((section) => section.id === id)?.title ?? 'Egen seksjon')

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
                <div className="start-choice" aria-label="Velg hvordan du vil starte">
                  <button onClick={() => {
                    if (window.confirm('Starte med en tom CV? Nåværende innhold erstattes i nettleseren.')) {
                      setCv(cloneBlank())
                      setNotice('Tom CV er klar. Klikk direkte i dokumentet for å skrive.')
                    }
                  }}><PenLine /><span><b>Start fra scratch</b><small>Fyll ut selv, ingen fil nødvendig</small></span></button>
                  <button onClick={() => fileRef.current?.click()} disabled={importing}><UploadCloud /><span><b>{importing ? 'Leser filen …' : 'Importer CV'}</b><small>Valgfritt · PDF, DOCX eller TXT</small></span></button>
                </div>
                <div className="optional-note"><Check /> Opplasting er helt valgfritt. Alle felt kan skrives og redigeres direkte.</div>
                {notice && <div className="notice" role="status">{notice}</div>}
                <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => changePhoto(event.target.files?.[0])} />
                <button className="panel-action" onClick={() => photoRef.current?.click()}><ImagePlus /> Bytt profilbilde</button>
                <div className="panel-section">
                  <div className="panel-section-head"><h3>Erfaring</h3><button onClick={() => setCv({ ...cv, experience: [...cv.experience, { id: crypto.randomUUID(), role: 'Ny stilling', company: 'Arbeidsgiver', period: 'År til år', bullets: ['Beskriv et konkret ansvar eller resultat.'] }] })}><Plus /> Legg til</button></div>
                  <div className="reorder-list">
                    {cv.experience.map((entry, index) => (
                      <article key={entry.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                        const from = Number(event.dataTransfer.getData('text/plain'))
                        const next = [...cv.experience]
                        const [moved] = next.splice(from, 1)
                        next.splice(index, 0, moved)
                        setCv({ ...cv, experience: next })
                      }}>
                        <GripVertical /><div><b>{entry.role}</b><small>{entry.company}</small></div>
                        <span><button onClick={() => moveExperience(index, -1)} aria-label="Flytt opp">↑</button><button onClick={() => moveExperience(index, 1)} aria-label="Flytt ned">↓</button><button onClick={() => setCv({ ...cv, experience: cv.experience.filter((item) => item.id !== entry.id) })} aria-label="Slett"><Trash2 /></button></span>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="panel-section">
                  <div className="panel-section-head"><h3>Utdanning</h3><button onClick={() => setCv({ ...cv, education: [...cv.education, { id: crypto.randomUUID(), degree: 'Ny utdanning', school: 'Skole eller studiested', period: 'År til år' }] })}><Plus /> Legg til</button></div>
                  <div className="reorder-list">
                    {cv.education.map((entry, index) => (
                      <article key={entry.id}>
                        <GripVertical /><div><b>{entry.degree}</b><small>{entry.school}</small></div>
                        <span><button onClick={() => moveEducation(index, -1)} aria-label="Flytt utdanning opp">↑</button><button onClick={() => moveEducation(index, 1)} aria-label="Flytt utdanning ned">↓</button><button onClick={() => setCv({ ...cv, education: cv.education.filter((item) => item.id !== entry.id) })} aria-label="Slett utdanning"><Trash2 /></button></span>
                      </article>
                    ))}
                  </div>
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
                  {([
                    ['skills', 'Kompetanse', 'Ny kompetanse'],
                    ['languages', 'Språk', 'Nytt språk og nivå'],
                    ['references', 'Referanser', 'Navn, rolle og kontakt'],
                  ] as const).map(([key, label, placeholder]) => <div className="list-editor" key={key}><div><b>{label}</b><button onClick={() => updateList(key, [...cv[key], placeholder])}><Plus /> Ny rad</button></div>{cv[key].map((item, index) => <span key={`${key}-${index}`}><small>{item}</small><button onClick={() => updateList(key, cv[key].filter((_, itemIndex) => itemIndex !== index))} aria-label={`Slett ${label.toLowerCase()} ${index + 1}`}><X /></button></span>)}</div>)}
                  {cv.customSections.map((section) => <div className="list-editor" key={section.id}><div><b>{section.title} <small>{section.placement === 'sidebar' ? 'Sidefelt' : 'Hovedfelt'}</small></b><button onClick={() => setCv({ ...cv, customSections: cv.customSections.map((item) => item.id === section.id ? { ...item, items: [...item.items, 'Ny rad'] } : item) })}><Plus /> Ny rad</button></div>{section.items.map((item, index) => <span key={`${section.id}-${index}`}><small>{item}</small><button onClick={() => setCv({ ...cv, customSections: cv.customSections.map((entry) => entry.id === section.id ? { ...entry, items: entry.items.filter((_, itemIndex) => itemIndex !== index) } : entry) })} aria-label={`Slett rad ${index + 1} fra ${section.title}`}><X /></button></span>)}</div>)}
                </div>
                <div className="panel-section">
                  <h3>Ny seksjon</h3>
                  <div className="new-section-form"><input value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="For eksempel kurs" /><select value={newSectionPlacement} onChange={(event) => setNewSectionPlacement(event.target.value as 'main' | 'sidebar')}><option value="sidebar">Sidefelt</option><option value="main">Hovedfelt</option></select><button onClick={() => addCustomSection(newSectionTitle, newSectionPlacement)} disabled={!newSectionTitle.trim()}><Plus /> Legg til</button></div>
                  <div className="section-suggestions"><small>Forslag</small>{['Kurs', 'Sertifiseringer', 'Prosjekter', 'Frivillig arbeid', 'Førerkort', 'Publikasjoner'].map((title) => <button key={title} onClick={() => addCustomSection(title, newSectionPlacement)}>{title}</button>)}</div>
                </div>
                <button className="reset-button" onClick={() => { setCv(cloneDefault()); setNotice('Eksempelinnholdet er gjenopprettet.') }}><RotateCcw /> Gjenopprett eksempel</button>
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
          <div className="cv-scale"><CvPreview data={cv} template={template} theme={theme} onChange={setCv} /></div>
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

const standardLetter = `Søknad på stilling som [stilling]

Hei,

Jeg ønsker å søke på stillingen som [stilling] hos [virksomhet]. Rollen virker interessant fordi den kombinerer oppgaver jeg motiveres av med et miljø der jeg kan bidra og utvikle meg videre.

Gjennom tidligere erfaring har jeg lært å arbeide strukturert, samarbeide godt og følge opp oppgaver fra start til slutt. [Legg inn et kort, konkret eksempel som viser et relevant resultat eller ansvar.]

Jeg tror særlig min erfaring med [relevant kompetanse] kan være nyttig i denne rollen. Samtidig er jeg nysgjerrig, lærer raskt og tar ansvar for å levere arbeid av god kvalitet.

Jeg håper bakgrunnen min kan være relevant, og ser frem til muligheten til å utdype motivasjonen og erfaringen min i et intervju.

Vennlig hilsen
[Navnet ditt]
[Telefon] · [E-post]`

function LetterStudio({ cv }: { cv: CvData }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobText, setJobText] = useState('')
  const [letter, setLetter] = useState(standardLetter)
  const [lastGenerated, setLastGenerated] = useState(0)
  const letterFit = useMemo(() => analyzeLetterFit(letter, jobText), [letter, jobText])
  const generate = () => {
    const now = Date.now()
    if (now - lastGenerated < 2500) return
    setLastGenerated(now)
    setLetter(makeLetter(cv, company, role, jobText))
  }
  const download = async () => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
    const lines = pdf.splitTextToSize(letter, 170)
    pdf.text(lines, 20, 24)
    pdf.save('Søknadsbrev.pdf')
  }
  return (
    <div className="letter-page">
      <div className="letter-heading"><span className="eyebrow">Søknadsstudio</span><h1>Et godt brev svarer på <em>én jobb</em></h1><p>Bruk CV-en som grunnlag, tilpass med annonsen og rediger hvert ord før du sender.</p></div>
      <div className="letter-workspace section-wrap">
        <aside>
          <label>Virksomhet<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="For eksempel NRK" /></label>
          <label>Stilling<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="For eksempel frontend-utvikler" /></label>
          <label>Stillingsannonse<textarea rows={10} maxLength={8000} value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="Lim inn annonsen …" /></label>
          <button className="button button-full" onClick={generate}><WandSparkles /> Lag et førsteutkast</button>
          {letterFit && <div className={`letter-fit ${letterFit.level}`} role="status"><Sparkles /><div><b>AI-sjekk: {letterFit.label}</b><p>Brevet dekker {letterFit.matched} av {letterFit.total} sentrale begreper fra annonsen.</p>{letterFit.missing.length > 0 && <small>Vurder om du kan dokumentere: {letterFit.missing.join(', ')}.</small>}</div></div>}
        </aside>
        <section className="letter-paper">
          <div className="letter-toolbar"><span><FileText /> Søknadsbrev</span><button onClick={download}><Download /> PDF</button></div>
          <textarea aria-label="Rediger søknadsbrev" value={letter} onChange={(event) => setLetter(event.target.value)} />
          <div className="letter-note"><Sparkles /> AI-utkast kan inneholde feil. Kontroller at alle påstander er riktige og skrevet med din stemme.</div>
        </section>
      </div>
    </div>
  )
}

function Footer({ navigate, setLegal }: { navigate: (view: View) => void; setLegal: (type: Legal) => void }) {
  return (
    <footer className="site-footer"><div className="footer-brand"><span className="brand-mark">ck</span><strong>CVklar</strong><p>Et enkelt arbeidsbord for CV og søknad laget for Norge.</p></div><div><b>Verktøy</b><button onClick={() => navigate('builder')}>Lag CV</button><button onClick={() => navigate('letter')}>Søknadsbrev</button><button onClick={() => navigate('guide')}>CV-guiden</button></div><div><b>Trygghet</b><button onClick={() => setLegal('privacy')}>Personvern</button><button onClick={() => setLegal('terms')}>Vilkår</button><a href="mailto:hei@cvklar.no">Kontakt</a></div><div className="footer-status"><ShieldCheck /><span><b>Dataene dine blir hos deg</b><small>Denne frontend-versjonen lagrer kun lokalt i nettleseren.</small></span></div><div className="footer-bottom"><span>© 2026 CVklar</span><span>Utformet i Bergen · Bokmål</span></div></footer>
  )
}

function LegalModal({ type, onClose }: { type: Legal; onClose: () => void }) {
  if (!type) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.section className="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Lukk"><X /></button>
        {type === 'privacy' ? <><span className="eyebrow">Sist oppdatert 20. juli 2026</span><h2 id="legal-title">Personvernerklæring</h2><p><strong>Kortversjonen:</strong> CV-en, profilbildet, stillingsannonsen og søknadsbrevet behandles på enheten din og lagres i nettleserens lokale lagring. Denne versjonen har ingen konto, database eller ekstern AI-overføring.</p><h3>Hva lagres?</h3><p>Dokumentdata lagres i localStorage slik at arbeidet ikke forsvinner ved oppdatering. Du kan slette alt ved å gjenopprette eksemplet eller tømme nettleserdata.</p><h3>Filer og PDF</h3><p>Opplastede filer leses i nettleseren og sendes ikke til CVklar. PDF-en genereres lokalt. Profilbilder lagres som en lokal dataadresse.</p><h3>Google-annonser og samtykke</h3><p>Når markedsføringssamtykke er gitt og AdSense er konfigurert, kan Google plassere eller lese informasjonskapsler, bruke IP-adresse og behandle bruksdata for annonselevering og måling. Før aktivering i Norge skal Google Privacy &amp; messaging eller en annen Google-sertifisert CMP være aktivert.</p><h3>Dine rettigheter</h3><p>Fordi CVklar ikke mottar dokumentopplysningene, har vi ikke en kopi å utlevere eller slette. Opplysninger behandlet av Google håndteres etter valgene i den sertifiserte samtykkeløsningen og Googles personvernvilkår.</p><p className="legal-warning">Dette er et produktutkast, ikke juridisk rådgivning. Legg inn korrekt selskapsnavn, organisasjonsnummer, adresse og kontaktpunkt før publisering.</p></> : <><span className="eyebrow">Sist oppdatert 20. juli 2026</span><h2 id="legal-title">Brukervilkår</h2><p>CVklar er et skrive- og formateringsverktøy. Du har ansvar for at innholdet du bruker er riktig, lovlig og ditt eget.</p><h3>AI-råd og utkast</h3><p>Råd og tekstutkast er veiledende og gir ingen garanti for intervju, ansettelse eller et bestemt resultat. Kontroller alltid fakta og tilpass språket før innsending.</p><h3>Tilgjengelighet</h3><p>Tjenesten leveres slik den er. Vi forsøker å gjøre lokal lagring og PDF-eksport pålitelig, men du bør beholde en egen kopi av viktige dokumenter.</p><h3>Akseptabel bruk</h3><p>Ikke bruk tjenesten til å laste opp skadevare, krenke andres rettigheter, utgi deg for å være noen andre eller automatisere misbruk.</p><h3>Reklame</h3><p>Google AdSense-annonser merkes tydelig og påvirker ikke rådene i CV-coachen. Ikke klikk annonser for å støtte tjenesten eller bruk automatiserte klikk.</p><p className="legal-warning">Før kommersiell lansering må vilkårene kvalitetssikres for faktisk foretaksinformasjon, betalingsmodell, annonseleverandører og valgt jurisdiksjon.</p></>}
      </motion.section>
    </div>
  )
}

function ConsentBanner({ onChoice }: { onChoice: (value: string) => void }) {
  return <div className="consent-banner"><div><ShieldCheck /><span><b>Personvern først</b><p>Nødvendig lokal lagring holder CV-en din på enheten. Google-annonser er avslått til du tillater markedsføring.</p></span></div><div><button className="button button-outline" onClick={() => onChoice('necessary')}>Kun nødvendig</button><button className="button" onClick={() => onChoice('accepted')}>Tillat markedsføring</button></div></div>
}

export default App
