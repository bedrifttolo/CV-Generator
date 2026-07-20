import type { FocusEvent, ReactNode } from 'react'
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import type { CvData, TemplateId } from '../types'

type Props = {
  data: CvData
  template: TemplateId
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

export default function CvPreview({ data, template, onChange }: Props) {
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

  const sections: Record<CvData['sectionOrder'][number], ReactNode> = {
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

  return (
    <div className={`cv-page template-${template}`} id="cv-document" aria-label="Redigerbar CV-forhåndsvisning">
      <aside className="cv-sidebar">
        {data.photo && <img src={data.photo} alt={`Profilbilde av ${data.name}`} className="cv-photo" />}
        <div className="cv-sidebar-content">
          <div className="cv-contact">
            <a href={`mailto:${data.email}`}><Mail size={13} /><Editable onCommit={(value) => update('email', value)}>{data.email}</Editable></a>
            <span><Phone size={13} /><Editable onCommit={(value) => update('phone', value)}>{data.phone}</Editable></span>
            <span><MapPin size={13} /><Editable onCommit={(value) => update('location', value)}>{data.location}</Editable></span>
            <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`}><ExternalLink size={13} /><Editable onCommit={(value) => update('website', value)}>{data.website}</Editable></a>
          </div>
          <div className="cv-side-block">
            <h2>Kompetanse</h2>
            <ul>{data.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
          </div>
          <div className="cv-side-block">
            <h2>Språk</h2>
            <ul>{data.languages.map((language) => <li key={language}>{language}</li>)}</ul>
          </div>
        </div>
      </aside>
      <main className="cv-main">
        <header className="cv-header">
          <span className="cv-kicker">Curriculum vitae</span>
          <h1><Editable onCommit={(value) => update('name', value)}>{data.name}</Editable></h1>
          <p><Editable onCommit={(value) => update('title', value)}>{data.title}</Editable></p>
        </header>
        <div className="cv-main-content">
          {data.sectionOrder.map((section) => sections[section])}
        </div>
      </main>
    </div>
  )
}
