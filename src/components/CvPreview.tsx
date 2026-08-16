import type { CSSProperties, FocusEvent, ReactNode } from 'react'
import { ExternalLink, Github, Mail, MapPin, Phone } from 'lucide-react'
import { colorThemes, cvStyleVars } from '../data'
import { hasProjectContent, hasReferenceContent } from '../lib/document'
import type { CvData, Project, Reference, TemplateId, ThemeId } from '../types'

type Props = {
  data: CvData
  template: TemplateId
  theme: ThemeId
  onChange: (next: CvData) => void
}

function Editable({
  children,
  className = '',
  multiline = false,
  onCommit,
}: {
  children: ReactNode
  className?: string
  multiline?: boolean
  onCommit: (value: string) => void
}) {
  const commit = (event: FocusEvent<HTMLElement>) => {
    const value = event.currentTarget.innerText.replace(/\n{3,}/g, '\n\n').trim()
    if (value) onCommit(value)
  }
  const Tag = multiline ? 'div' : 'span'
  return (
    <Tag
      className={`editable ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onBlur={commit}
      onKeyDown={(event) => {
        if (!multiline && event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    >
      {children}
    </Tag>
  )
}

const toHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`)

const linkLabel = (value: string) => {
  try {
    const url = new URL(toHref(value))
    const path = url.pathname.replace(/\/$/, '')
    return `${url.hostname.replace(/^www\./, '')}${path.length > 1 && path.length < 18 ? path : ''}`
  } catch {
    return value
  }
}

export default function CvPreview({ data, template, theme, onChange }: Props) {
  const palette = colorThemes.find((item) => item.id === theme) ?? colorThemes[0]
  const documentStyle = {
    '--cv-accent': palette.accent,
    '--cv-side': palette.sidebar,
    '--cv-tint': palette.tint,
    '--cv-highlight': palette.highlight,
    ...cvStyleVars(data.appearance),
  } as CSSProperties
  const projects = data.projects ?? []
  const references = data.references ?? []
  const referencePlacement = data.referencePlacement ?? 'sidebar'

  const update = <K extends keyof CvData>(key: K, value: CvData[K]) => onChange({ ...data, [key]: value })
  const updateExperience = (index: number, key: 'role' | 'company' | 'period', value: string) => {
    update('experience', data.experience.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry)))
  }
  const updateBullet = (experienceIndex: number, bulletIndex: number, value: string) => {
    update('experience', data.experience.map((entry, itemIndex) =>
      itemIndex === experienceIndex
        ? { ...entry, bullets: entry.bullets.map((bullet, index) => (index === bulletIndex ? value : bullet)) }
        : entry,
    ))
  }
  const updateEducation = (index: number, key: 'degree' | 'school' | 'period', value: string) => {
    update('education', data.education.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry)))
  }
  const updateProject = (index: number, key: keyof Project, value: string) => {
    update('projects', projects.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry)))
  }
  const updateTechnology = (projectIndex: number, techIndex: number, value: string) => {
    update('projects', projects.map((entry, itemIndex) =>
      itemIndex === projectIndex
        ? { ...entry, technologies: (entry.technologies ?? []).map((item, index) => (index === techIndex ? value : item)) }
        : entry,
    ))
  }
  const updateReference = (index: number, key: keyof Reference, value: string) => {
    update('references', references.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry)))
  }
  const updateListItem = (key: 'skills' | 'languages', index: number, value: string) => {
    update(key, data[key].map((item, itemIndex) => (itemIndex === index ? value : item)))
  }
  const updateCustomSection = (id: string, title?: string, itemIndex?: number, value?: string) => {
    update('customSections', data.customSections.map((section) => {
      if (section.id !== id) return section
      if (title !== undefined) return { ...section, title }
      if (itemIndex !== undefined && value !== undefined) {
        return { ...section, items: section.items.map((item, index) => (index === itemIndex ? value : item)) }
      }
      return section
    }))
  }

  const referenceCard = (reference: Reference, index: number) => (
    <div className="cv-reference" data-cv-block key={reference.id}>
      {reference.name && <b><Editable onCommit={(value) => updateReference(index, 'name', value)}>{reference.name}</Editable></b>}
      {(reference.role || reference.company) && (
        <span>
          {reference.role && <Editable onCommit={(value) => updateReference(index, 'role', value)}>{reference.role}</Editable>}
          {reference.role && reference.company ? ', ' : ''}
          {reference.company && <Editable onCommit={(value) => updateReference(index, 'company', value)}>{reference.company}</Editable>}
        </span>
      )}
      {reference.phone && <span><Editable onCommit={(value) => updateReference(index, 'phone', value)}>{reference.phone}</Editable></span>}
      {reference.email && <span><Editable onCommit={(value) => updateReference(index, 'email', value)}>{reference.email}</Editable></span>}
      {reference.text && <span><Editable onCommit={(value) => updateReference(index, 'text', value)}>{reference.text}</Editable></span>}
    </div>
  )

  const visibleReferences = references.filter(hasReferenceContent)
  const visibleProjects = projects.filter(hasProjectContent)
  const visibleExperience = data.experience.filter((entry) =>
    Boolean(entry.role.trim() || entry.company.trim() || entry.period.trim() || entry.companyLogo || entry.bullets.some((bullet) => bullet.trim())),
  )
  const visibleEducation = data.education.filter((entry) => Boolean(entry.degree.trim() || entry.school.trim() || entry.period.trim()))
  const visibleSkills = data.skills.map((value, index) => ({ value, index })).filter(({ value }) => value.trim())
  const visibleLanguages = data.languages.map((value, index) => ({ value, index })).filter(({ value }) => value.trim())
  const contactFields = ['email', 'phone', 'location', 'website'].filter(
    (field) => !data.hiddenContactFields.includes(field) && String(data[field as keyof CvData] ?? '').trim(),
  )

  const sections: Record<string, ReactNode> = {}
  if (data.summary.trim()) {
    sections.summary = (
      <section className="cv-section" key="summary">
        <h2>Profil</h2>
        <Editable multiline onCommit={(value) => update('summary', value)}>{data.summary}</Editable>
      </section>
    )
  }
  if (visibleExperience.length) {
    sections.experience = (
      <section className="cv-section" key="experience">
        <h2>Erfaring</h2>
        <div className="cv-entries">
          {visibleExperience.map((entry) => {
            const index = data.experience.indexOf(entry)
            return <article className="cv-entry" data-cv-block key={entry.id}>
              {entry.companyLogo && <img className="cv-entry-logo" src={entry.companyLogo} alt="" aria-hidden="true" />}
              <div className="cv-entry-body">
                <div className="cv-entry-head">
                  <div>
                    <h3><Editable onCommit={(value) => updateExperience(index, 'role', value)}>{entry.role}</Editable></h3>
                    <p><Editable onCommit={(value) => updateExperience(index, 'company', value)}>{entry.company}</Editable></p>
                  </div>
                  {entry.period && <time><Editable onCommit={(value) => updateExperience(index, 'period', value)}>{entry.period}</Editable></time>}
                </div>
                {entry.bullets.length > 0 && (
                  <ul>
                    {entry.bullets.map((bullet, bulletIndex) => (
                      <li key={`${entry.id}-${bulletIndex}`}>
                        <Editable multiline onCommit={(value) => updateBullet(index, bulletIndex, value)}>{bullet}</Editable>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          })}
        </div>
      </section>
    )
  }
  if (visibleEducation.length) {
    sections.education = (
      <section className="cv-section" key="education">
        <h2>Utdanning</h2>
        <div className="cv-entries compact">
          {visibleEducation.map((entry) => {
            const index = data.education.indexOf(entry)
            return <article className="cv-entry" data-cv-block key={entry.id}>
              <div className="cv-entry-body">
                <div className="cv-entry-head">
                  <div>
                    <h3><Editable onCommit={(value) => updateEducation(index, 'degree', value)}>{entry.degree}</Editable></h3>
                    <p><Editable onCommit={(value) => updateEducation(index, 'school', value)}>{entry.school}</Editable></p>
                  </div>
                  {entry.period && <time><Editable onCommit={(value) => updateEducation(index, 'period', value)}>{entry.period}</Editable></time>}
                </div>
              </div>
            </article>
          })}
        </div>
      </section>
    )
  }
  if (visibleProjects.length) {
    sections.projects = (
      <section className="cv-section" key="projects">
        <h2>Mine prosjekter</h2>
        <div className="cv-entries">
          {visibleProjects.map((project) => {
            const index = projects.indexOf(project)
            const technologies = (project.technologies ?? []).filter((item) => item.trim())
            return (
              <article className="cv-entry cv-project" data-cv-block key={project.id}>
                {project.image && <img className="cv-entry-logo" src={project.image} alt="" aria-hidden="true" />}
                <div className="cv-entry-body">
                  <div className="cv-entry-head">
                    <div>
                      <h3><Editable onCommit={(value) => updateProject(index, 'title', value)}>{project.title}</Editable></h3>
                      {project.subtitle && <p><Editable onCommit={(value) => updateProject(index, 'subtitle', value)}>{project.subtitle}</Editable></p>}
                      {technologies.length > 0 && (
                        <p className="cv-project-tech">
                          {technologies.map((item, techIndex) => (
                            <span key={`${project.id}-tech-${techIndex}`}>
                              <Editable onCommit={(value) => updateTechnology(index, techIndex, value)}>{item}</Editable>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    {project.period && <time><Editable onCommit={(value) => updateProject(index, 'period', value)}>{project.period}</Editable></time>}
                  </div>
                  {project.description && (
                    <div className="cv-project-text">
                      <Editable multiline onCommit={(value) => updateProject(index, 'description', value)}>{project.description}</Editable>
                    </div>
                  )}
                  {(project.url || project.githubUrl) && (
                    <p className="cv-project-links">
                      {project.githubUrl && (
                        <a href={toHref(project.githubUrl)} target="_blank" rel="noreferrer"><Github size={11} /> GitHub</a>
                      )}
                      {project.url && (
                        <a href={toHref(project.url)} target="_blank" rel="noreferrer"><ExternalLink size={11} /> {linkLabel(project.url)}</a>
                      )}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }
  if (visibleSkills.length) {
    sections.skills = (
      <section className="cv-section cv-skills-main" key="skills">
        <h2>Kompetanse</h2>
        <div className="cv-chips">
          {visibleSkills.map(({ value, index }) => (
            <Editable key={`${value}-${index}`} onCommit={(next) => updateListItem('skills', index, next)}>{value}</Editable>
          ))}
        </div>
      </section>
    )
  }
  if (referencePlacement === 'main' && visibleReferences.length) {
    sections.references = (
      <section className="cv-section" key="references">
        <h2>Referanser</h2>
        <div className="cv-references">
          {visibleReferences.map((reference) => referenceCard(reference, references.indexOf(reference)))}
        </div>
      </section>
    )
  }
  data.customSections
    .filter((section) => section.placement === 'main' && section.items.some((item) => item.trim()))
    .forEach((section) => {
      sections[section.id] = (
        <section className="cv-section" key={section.id}>
          <h2><Editable onCommit={(value) => updateCustomSection(section.id, value)}>{section.title}</Editable></h2>
          <ul className="cv-custom-list">
            {section.items.map((item, index) => (
              <li key={`${section.id}-${index}`}>
                <Editable multiline onCommit={(value) => updateCustomSection(section.id, undefined, index, value)}>{item}</Editable>
              </li>
            ))}
          </ul>
        </section>
      )
    })

  const sidebarSections: Record<string, ReactNode> = {}
  if (contactFields.length) {
    sidebarSections.contact = (
      <div className="cv-contact-section" key="contact">
        <h2>Kontakt</h2>
        <div className="cv-contact">
          {contactFields.includes('email') && <a href={`mailto:${data.email}`}><Mail size={13} /><Editable onCommit={(value) => update('email', value)}>{data.email}</Editable></a>}
          {contactFields.includes('phone') && <span><Phone size={13} /><Editable onCommit={(value) => update('phone', value)}>{data.phone}</Editable></span>}
          {contactFields.includes('location') && <span><MapPin size={13} /><Editable onCommit={(value) => update('location', value)}>{data.location}</Editable></span>}
          {contactFields.includes('website') && <a href={toHref(data.website)}><ExternalLink size={13} /><Editable onCommit={(value) => update('website', value)}>{data.website}</Editable></a>}
        </div>
      </div>
    )
  }
  if (visibleSkills.length) {
    sidebarSections['side-skills'] = (
      <div className="cv-side-block" key="side-skills">
        <h2>Kompetanse</h2>
        <ul>{visibleSkills.map(({ value, index }) => <li key={`${value}-${index}`}><Editable onCommit={(next) => updateListItem('skills', index, next)}>{value}</Editable></li>)}</ul>
      </div>
    )
  }
  if (visibleLanguages.length) {
    sidebarSections.languages = (
      <div className="cv-side-block" key="languages">
        <h2>Språk</h2>
        <ul>{visibleLanguages.map(({ value, index }) => <li key={`${value}-${index}`}><Editable onCommit={(next) => updateListItem('languages', index, next)}>{value}</Editable></li>)}</ul>
      </div>
    )
  }
  if (referencePlacement === 'sidebar' && visibleReferences.length) {
    sidebarSections.references = (
      <div className="cv-side-block cv-side-references" key="references">
        <h2>Referanser</h2>
        {visibleReferences.map((reference) => referenceCard(reference, references.indexOf(reference)))}
      </div>
    )
  }
  data.customSections
    .filter((section) => section.placement === 'sidebar' && section.items.some((item) => item.trim()))
    .forEach((section) => {
      sidebarSections[section.id] = (
        <div className="cv-side-block" key={section.id}>
          <h2><Editable onCommit={(value) => updateCustomSection(section.id, value)}>{section.title}</Editable></h2>
          <ul>
            {section.items.map((item, index) => (
              <li key={`${section.id}-${index}`}>
                <Editable multiline onCommit={(value) => updateCustomSection(section.id, undefined, index, value)}>{item}</Editable>
              </li>
            ))}
          </ul>
        </div>
      )
    })

  const visibleSidebar = data.sidebarOrder.filter((id) => !data.hiddenSections.includes(id) && sidebarSections[id])
  const visibleMain = data.sectionOrder.filter((id) => !data.hiddenSections.includes(id) && sections[id])

  return (
    <div className={`cv-page template-${template}`} style={documentStyle} id="cv-document" aria-label="Redigerbar CV-forhåndsvisning">
      <aside className="cv-sidebar">
        {data.photo && <img src={data.photo} alt={`Profilbilde av ${data.name}`} className="cv-photo" />}
        {visibleSidebar.length > 0 && (
          <div className="cv-sidebar-content">
            {visibleSidebar.map((id) => sidebarSections[id])}
          </div>
        )}
      </aside>
      <main className="cv-main">
        <header className="cv-header">
          <h1><Editable onCommit={(value) => update('name', value)}>{data.name}</Editable></h1>
          {data.title && <p><Editable onCommit={(value) => update('title', value)}>{data.title}</Editable></p>}
        </header>
        <div className="cv-main-content">
          {visibleMain.map((id) => sections[id])}
        </div>
      </main>
    </div>
  )
}
