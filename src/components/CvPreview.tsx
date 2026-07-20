import type { CSSProperties, FocusEvent, ReactNode } from 'react'
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import { colorThemes } from '../data'
import type { CvData, TemplateId, ThemeId } from '../types'

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

export default function CvPreview({ data, template, theme, onChange }: Props) {
  const palette = colorThemes.find((item) => item.id === theme) ?? colorThemes[0]
  const themeStyle = {
    '--cv-accent': palette.accent,
    '--cv-side': palette.sidebar,
    '--cv-tint': palette.tint,
    '--cv-highlight': palette.highlight,
  } as CSSProperties
  const update = <K extends keyof CvData>(key: K, value: CvData[K]) => onChange({ ...data, [key]: value })
  const updateExperience = (index: number, key: 'role' | 'company' | 'period', value: string) => {
    const experience = data.experience.map((entry, itemIndex) =>
      itemIndex === index ? { ...entry, [key]: value } : entry,
    )
    update('experience', experience)
  }
  const updateBullet = (experienceIndex: number, bulletIndex: number, value: string) => {
    const experience = data.experience.map((entry, itemIndex) =>
      itemIndex === experienceIndex
        ? { ...entry, bullets: entry.bullets.map((bullet, index) => (index === bulletIndex ? value : bullet)) }
        : entry,
    )
    update('experience', experience)
  }
  const updateEducation = (index: number, key: 'degree' | 'school' | 'period', value: string) => {
    const education = data.education.map((entry, itemIndex) =>
      itemIndex === index ? { ...entry, [key]: value } : entry,
    )
    update('education', education)
  }
  const updateListItem = (key: 'skills' | 'languages' | 'references', index: number, value: string) => {
    update(key, data[key].map((item, itemIndex) => itemIndex === index ? value : item))
  }
  const updateCustomSection = (id: string, title?: string, itemIndex?: number, value?: string) => {
    update('customSections', data.customSections.map((section) => {
      if (section.id !== id) return section
      if (title !== undefined) return { ...section, title }
      if (itemIndex !== undefined && value !== undefined) {
        return { ...section, items: section.items.map((item, index) => index === itemIndex ? value : item) }
      }
      return section
    }))
  }

  const sections: Record<string, ReactNode> = {
    summary: (
      <section className="cv-section" key="summary">
        <h2>Profil</h2>
        <Editable multiline onCommit={(value) => update('summary', value)}>{data.summary}</Editable>
      </section>
    ),
    experience: (
      <section className="cv-section" key="experience">
        <h2>Erfaring</h2>
        <div className="cv-entries">
          {data.experience.map((entry, index) => (
            <article className="cv-entry" key={entry.id}>
              <div className="cv-entry-head">
                <div>
                  <h3><Editable onCommit={(value) => updateExperience(index, 'role', value)}>{entry.role}</Editable></h3>
                  <p><Editable onCommit={(value) => updateExperience(index, 'company', value)}>{entry.company}</Editable></p>
                </div>
                <time><Editable onCommit={(value) => updateExperience(index, 'period', value)}>{entry.period}</Editable></time>
              </div>
              <ul>
                {entry.bullets.map((bullet, bulletIndex) => (
                  <li key={`${entry.id}-${bulletIndex}`}>
                    <Editable multiline onCommit={(value) => updateBullet(index, bulletIndex, value)}>{bullet}</Editable>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    ),
    education: (
      <section className="cv-section" key="education">
        <h2>Utdanning</h2>
        <div className="cv-entries compact">
          {data.education.map((entry, index) => (
            <article className="cv-entry" key={entry.id}>
              <div className="cv-entry-head">
                <div>
                  <h3><Editable onCommit={(value) => updateEducation(index, 'degree', value)}>{entry.degree}</Editable></h3>
                  <p><Editable onCommit={(value) => updateEducation(index, 'school', value)}>{entry.school}</Editable></p>
                </div>
                <time><Editable onCommit={(value) => updateEducation(index, 'period', value)}>{entry.period}</Editable></time>
              </div>
            </article>
          ))}
        </div>
      </section>
    ),
    skills: (
      <section className="cv-section cv-skills-main" key="skills">
        <h2>Kompetanse</h2>
        <div className="cv-chips">
          {data.skills.map((skill, index) => (
            <Editable key={`${skill}-${index}`} onCommit={(value) => update('skills', data.skills.map((item, itemIndex) => itemIndex === index ? value : item))}>{skill}</Editable>
          ))}
        </div>
      </section>
    ),
  }
  data.customSections.filter((section) => section.placement === 'main').forEach((section) => {
    sections[section.id] = (
      <section className="cv-section" key={section.id}>
        <h2><Editable onCommit={(value) => updateCustomSection(section.id, value)}>{section.title}</Editable></h2>
        <ul className="cv-custom-list">{section.items.map((item, index) => <li key={`${section.id}-${index}`}><Editable multiline onCommit={(value) => updateCustomSection(section.id, undefined, index, value)}>{item}</Editable></li>)}</ul>
      </section>
    )
  })

  const sidebarSections: Record<string, ReactNode> = {
    contact: (
      <div className="cv-contact-section" key="contact">
        <h2>Kontakt</h2>
        <div className="cv-contact">
          <a href={`mailto:${data.email}`}><Mail size={13} /><Editable onCommit={(value) => update('email', value)}>{data.email}</Editable></a>
          <span><Phone size={13} /><Editable onCommit={(value) => update('phone', value)}>{data.phone}</Editable></span>
          <span><MapPin size={13} /><Editable onCommit={(value) => update('location', value)}>{data.location}</Editable></span>
          <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`}><ExternalLink size={13} /><Editable onCommit={(value) => update('website', value)}>{data.website}</Editable></a>
        </div>
      </div>
    ),
    'side-skills': (
      <div className="cv-side-block" key="side-skills">
        <h2>Kompetanse</h2>
        <ul>{data.skills.map((skill, index) => <li key={`${skill}-${index}`}><Editable onCommit={(value) => updateListItem('skills', index, value)}>{skill}</Editable></li>)}</ul>
      </div>
    ),
    languages: (
      <div className="cv-side-block" key="languages">
        <h2>Språk</h2>
        <ul>{data.languages.map((language, index) => <li key={`${language}-${index}`}><Editable onCommit={(value) => updateListItem('languages', index, value)}>{language}</Editable></li>)}</ul>
      </div>
    ),
    references: (
      <div className="cv-side-block" key="references">
        <h2>Referanser</h2>
        <ul>{data.references.map((reference, index) => <li key={`${reference}-${index}`}><Editable multiline onCommit={(value) => updateListItem('references', index, value)}>{reference}</Editable></li>)}</ul>
      </div>
    ),
  }
  data.customSections.filter((section) => section.placement === 'sidebar').forEach((section) => {
    sidebarSections[section.id] = (
      <div className="cv-side-block" key={section.id}>
        <h2><Editable onCommit={(value) => updateCustomSection(section.id, value)}>{section.title}</Editable></h2>
        <ul>{section.items.map((item, index) => <li key={`${section.id}-${index}`}><Editable multiline onCommit={(value) => updateCustomSection(section.id, undefined, index, value)}>{item}</Editable></li>)}</ul>
      </div>
    )
  })

  return (
    <div className={`cv-page template-${template}`} style={themeStyle} id="cv-document" aria-label="Redigerbar CV-forhåndsvisning">
      <aside className="cv-sidebar">
        {data.photo && <img src={data.photo} alt={`Profilbilde av ${data.name}`} className="cv-photo" />}
        <div className="cv-sidebar-content">
          {data.sidebarOrder.filter((id) => !data.hiddenSections.includes(id)).map((id) => sidebarSections[id])}
        </div>
      </aside>
      <main className="cv-main">
        <header className="cv-header">
          <span className="cv-kicker">Curriculum vitae</span>
          <h1><Editable onCommit={(value) => update('name', value)}>{data.name}</Editable></h1>
          <p><Editable onCommit={(value) => update('title', value)}>{data.title}</Editable></p>
        </header>
        <div className="cv-main-content">
          {data.sectionOrder.filter((id) => !data.hiddenSections.includes(id)).map((id) => sections[id])}
        </div>
      </main>
    </div>
  )
}
