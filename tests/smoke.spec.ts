import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('forside og CV-arbeidsbord fungerer', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('fonts.googleapis.com')) errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /CV-en som får frem/i })).toBeVisible()
  await expect(page.getByText('Behandles lokalt')).toHaveCount(0)
  await expect(page.getByText('Google-annonseplass')).toHaveCount(0)
  await page.getByRole('button', { name: 'Kun nødvendig' }).click()

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Vis meny' }).click()
    await expect(page.getByRole('navigation')).toBeVisible()
    await page.getByRole('button', { name: 'Vis meny' }).click()
  }
  await page.getByRole('button', { name: /Start fra scratch/ }).click()

  await expect(page.getByLabel('Redigerbar CV-forhåndsvisning')).toBeVisible()
  await expect(page.getByText('Lagret lokalt', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Lagre lokalt', exact: true })).toBeVisible()
  await expect(page.locator('#cv-document')).toContainText('Navnet ditt')
  await expect(page.getByText(/Opplasting er helt valgfritt/)).toBeVisible()
  const experienceSection = page.locator('.panel-section').filter({ has: page.locator('h3', { hasText: 'Erfaring' }) })
  const educationSection = page.locator('.panel-section').filter({ has: page.locator('h3', { hasText: 'Utdanning' }) })
  await experienceSection.getByRole('button', { name: /Legg til/ }).click()
  await educationSection.getByRole('button', { name: /Legg til/ }).click()
  await expect(experienceSection.locator('.reorder-list article')).toHaveCount(2)
  await expect(educationSection.locator('.reorder-list article')).toHaveCount(2)
  const mainSections = page.locator('.panel-section').filter({ has: page.locator('h3', { hasText: 'Hovedfelt' }) })
  await mainSections.getByText('Kompetanse nederst').click()
  await expect(page.locator('.cv-main .cv-skills-main')).toHaveCount(0)
  await expect(page.locator('.cv-sidebar')).toContainText('Kompetanse')
  await page.getByRole('button', { name: 'Kurs', exact: true }).click()
  await expect(page.locator('.cv-sidebar')).toContainText('Kurs')
  await expect(page.locator('.cv-sidebar')).toContainText('Referanser')
  await page.getByText('Nettside eller LinkedIn').click()
  await expect(page.locator('.cv-contact')).not.toContainText('linkedin.com/in/dittnavn')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-sections.png`, fullPage: true })
  await page.getByRole('button', { name: /Maler/ }).click()
  await page.getByRole('button', { name: /Fjord/ }).click()
  await expect(page.locator('#cv-document')).toHaveClass(/template-fjord/)
  await page.getByRole('button', { name: /ATS Enkel/ }).click()
  await expect(page.locator('#cv-document')).toHaveClass(/template-ats/)
  await page.getByRole('button', { name: 'Velg fargetema Hav' }).click()
  await expect(page.locator('#cv-document')).toHaveAttribute('style', /--cv-accent: #1b6480/)
  await page.getByRole('button', { name: /AI-råd/ }).click()
  await page.getByPlaceholder(/Lim inn teksten fra annonsen/).fill('Vi søker en utvikler med React, TypeScript, API, test og samarbeid.')
  await expect(page.getByText('Treff mot stillingsannonsen')).toBeVisible()
  const panel = page.locator('.panel-scroll')
  const dimensions = await panel.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }))
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight)
  await panel.evaluate((element) => element.scrollTo({ top: element.scrollHeight }))
  await expect(page.getByText('Kildegrunnlag')).toBeVisible()
  expect(await panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-builder.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('guide og søknadsbrev kan åpnes', async ({ page }, testInfo) => {
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Vis meny' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'CV-guiden', exact: true }).click()
  await expect(page.getByRole('heading', { name: /En god CV er ikke hele historien/ })).toBeVisible()
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Vis meny' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Søknadsbrev', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Et godt brev svarer/ })).toBeVisible()
  await expect(page.getByLabel('Rediger søknadsbrev')).toHaveValue(/\[Navnet ditt\]/)
  await expect(page.getByLabel('Rediger søknadsbrev')).not.toHaveValue(/Thomas/)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-letter.png`, fullPage: true })
})

test('en personlig CV lagres lokalt og beholdes etter reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Lokal lagring dekkes av desktopmotorene')
  await page.addInitScript(() => {
    if (sessionStorage.getItem('cvklar-personal-fixture')) return
    sessionStorage.setItem('cvklar-personal-fixture', 'ready')
    localStorage.setItem('cvklar-document', JSON.stringify({
      name: 'Thomas Tolo Jensen',
      title: 'Fullstack-utvikler',
      email: 'thomastj278@gmail.com',
      website: 'tolojensentech.no',
    }))
  })
  await page.goto('/cv')
  const document = page.locator('#cv-document')
  await expect(document).toContainText('Thomas Tolo Jensen')
  const summary = document.locator('.cv-section').filter({ has: page.getByRole('heading', { name: 'Profil', exact: true }) }).locator('.editable')
  await summary.fill('Denne teksten skal ligge trygt i nettleseren etter en reload.')
  await summary.blur()
  await page.getByRole('button', { name: 'Lagre lokalt', exact: true }).click()
  await expect(page.getByText('CV-en er lagret lokalt i denne nettleseren.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cvklar-document') ?? '{}').summary)).toBe('Denne teksten skal ligge trygt i nettleseren etter en reload.')

  await page.reload()
  await expect(document).toContainText('Thomas Tolo Jensen')
  await expect(document).toContainText('Denne teksten skal ligge trygt i nettleseren etter en reload.')
})

test('CV-import trekker ut data og PDF kan lastes ned', async ({ page }, testInfo) => {
  await page.addInitScript(() => Reflect.deleteProperty(Promise, 'withResolvers'))
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: /Start fra scratch/ }).click()
  await page.locator('input[accept=".pdf,.docx,.txt"]').setInputFiles({
    name: 'ola-cv.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(`Ola Nordmann\nFrontend-utvikler\nola@example.no\n+47 999 88 777\n\nProfil\nUtvikler som lager tilgjengelige og raske tjenester for norske brukere.\n\nFerdigheter\nProgrammeringsspråk:\n• React\n• TypeScript\nTilgjengelighet:\n• Universell utforming\n\nArbeidserfaring\nFrontend-utvikler – Eksempel AS\n2022 – nå\nForbedret lastetid med 40 prosent.\n\nUtdanning\nBachelor i informatikk\nUniversitetet i Oslo\n2019 – 2022\n• Utviklet en tilgjengelig bacheloroppgave i samarbeid med næringslivet.\n\nMine prosjekter\nTilgjengelig portal – 2023 – 2024\nFrontend-utvikler\n• Bygget en rask portal med universell utforming.\n• Reduserte lastetiden og forbedret tastaturnavigasjonen.`),
  })
  await expect(page.getByText(/Ferdig! Kontroller/)).toBeVisible()
  await expect(page.locator('#cv-document')).toContainText('Ola Nordmann')
  await expect(page.locator('#cv-document')).toContainText('ola@example.no')
  await expect(page.locator('#cv-document .cv-skill-group').filter({ hasText: 'Programmeringsspråk' })).toHaveCount(1)
  await expect(page.locator('#cv-document .cv-project')).toContainText('Tilgjengelig portal')
  await expect(page.locator('#cv-document .cv-education-section .cv-entry-bullets')).toContainText('Utviklet en tilgjengelig bacheloroppgave')
  await expect(page.locator('#cv-document .cv-project .cv-entry-bullets li')).toHaveCount(2)

  const experiencePanel = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Erfaring', exact: true }) })
  await experiencePanel.getByRole('button', { name: 'Nytt punkt' }).click()
  await experiencePanel.getByRole('textbox', { name: 'Erfaringspunkt 2', exact: true }).fill('Samarbeidet tett med design og innhold.')
  await experiencePanel.getByRole('button', { name: 'Ny lenke' }).click()
  await experiencePanel.getByLabel('Erfaring 1 lenketekst 1').fill('Se arbeidsgiver')
  await experiencePanel.getByLabel('Erfaring 1 lenkeadresse 1').fill('https://example.no/arbeid')
  const educationPanel = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Utdanning', exact: true }) })
  await educationPanel.getByRole('button', { name: 'Nytt punkt' }).click()
  await educationPanel.getByLabel('Utdanningspunkt 2', { exact: true }).fill('Fullførte studiet med en relevant faglig fordypning.')
  const entryImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgQCAZMYD9sAAAAASUVORK5CYII=', 'base64')
  const educationImageChooser = page.waitForEvent('filechooser')
  await educationPanel.getByRole('button', { name: 'Bilde / skolelogo (valgfritt)' }).click()
  await (await educationImageChooser).setFiles({ name: 'school.png', mimeType: 'image/png', buffer: entryImage })
  const projectPanel = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Mine prosjekter', exact: true }) })
  await projectPanel.getByRole('button', { name: 'Nytt punkt' }).click()
  await projectPanel.getByLabel('Prosjektpunkt 3', { exact: true }).fill('Dokumenterte løsningen og overleverte den til produkteier.')
  await projectPanel.getByRole('button', { name: 'Ny lenke' }).click()
  await projectPanel.getByLabel('Prosjekt 1 lenketekst 1').fill('Åpne app')
  await projectPanel.getByLabel('Prosjekt 1 lenkeadresse 1').fill('https://app.example.no')
  const projectImageChooser = page.waitForEvent('filechooser')
  await projectPanel.getByRole('button', { name: 'Prosjektbilde (valgfritt)' }).click()
  await (await projectImageChooser).setFiles({ name: 'portal.png', mimeType: 'image/png', buffer: entryImage })
  await expect(page.locator('#cv-document .cv-project .cv-entry-logo')).toHaveCount(1)
  await expect(page.locator('#cv-document .cv-education-section .cv-entry-logo')).toHaveCount(1)
  await expect(page.locator('#cv-document a[href="https://example.no/arbeid"]')).toContainText('Se arbeidsgiver')
  await expect(page.locator('#cv-document a[href="https://app.example.no"]')).toContainText('Åpne app')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Last ned PDF/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('Ola_Nordmann_CV.pdf')
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await getDocument({ data: new Uint8Array(await readFile(downloadPath!)) }).promise
  const firstPage = await pdf.getPage(1)
  const viewport = firstPage.getViewport({ scale: 1 })
  expect(viewport.width).toBeCloseTo(595.28, 0)
  expect(viewport.height).toBeCloseTo(841.89, 0)
  const metadata = await pdf.getMetadata()
  expect((metadata.info as { Subject?: string }).Subject).toMatch(/^CVKLAR_DATA_V1:/)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Start fra scratch/ }).click()
  await expect(page.locator('#cv-document')).toContainText('Navnet ditt')
  await page.locator('input[accept=".pdf,.docx,.txt"]').setInputFiles({
    name: 'Ola_Nordmann_CV.pdf',
    mimeType: 'application/pdf',
    buffer: await readFile(downloadPath!),
  })
  await expect(page.getByText(/Ferdig! Kontroller/)).toBeVisible()
  await expect(page.locator('#cv-document')).toContainText('Ola Nordmann')
  await expect(page.locator('#cv-document')).toContainText('Forbedret lastetid med 40 prosent.')
  await expect(page.locator('#cv-document')).toContainText('Samarbeidet tett med design og innhold.')
  await expect(page.locator('#cv-document .cv-skill-group').filter({ hasText: 'Universell utforming' })).toHaveCount(1)
  await expect(page.locator('#cv-document .cv-project')).toContainText('Tilgjengelig portal')
  await expect(page.locator('#cv-document .cv-project .cv-entry-logo')).toHaveCount(1)
  await expect(page.locator('#cv-document .cv-education-section .cv-entry-logo')).toHaveCount(1)
  await expect(page.locator('#cv-document .cv-education-section')).toContainText('Fullførte studiet med en relevant faglig fordypning.')
  await expect(page.locator('#cv-document .cv-project')).toContainText('Dokumenterte løsningen og overleverte den til produkteier.')
  await expect(page.locator('#cv-document a[href="https://example.no/arbeid"]')).toContainText('Se arbeidsgiver')
  await expect(page.locator('#cv-document a[href="https://app.example.no"]')).toContainText('Åpne app')
})

test('en lang CV eksporteres over flere A4-sider', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Flersiders eksport kjøres én gang')
  test.setTimeout(60_000)
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: /Start fra scratch/ }).click()
  const experience = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Erfaring', exact: true }) })
  for (let index = 0; index < 16; index += 1) await experience.getByRole('button', { name: /Legg til/ }).click()
  expect(await page.locator('#cv-document').evaluate((element) => element.scrollHeight)).toBeGreaterThan(1123)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Last ned PDF/ }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await getDocument({ data: new Uint8Array(await readFile(downloadPath!)) }).promise
  expect(pdf.numPages).toBeGreaterThanOrEqual(2)
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const viewport = (await pdf.getPage(pageNumber)).getViewport({ scale: 1 })
    expect(viewport.width).toBeCloseTo(595.28, 0)
    expect(viewport.height).toBeCloseTo(841.89, 0)
  }
})

test('prosjekter, logoer, referanseplassering og A4-innstillinger fungerer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Detaljert dokumenttest kjøres én gang')
  test.setTimeout(120_000)
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: /Start fra scratch/ }).click()

  const document = page.locator('#cv-document')
  const geometry = await document.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      width: element.getBoundingClientRect().width,
      minHeight: Number.parseFloat(style.minHeight),
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
    }
  })
  expect(geometry.width).toBeCloseTo(793.7, 0)
  expect(geometry.minHeight).toBeCloseTo(1122.5, 0)
  expect(geometry.fontSize).toBeCloseTo(14, 0)
  expect(geometry.lineHeight / geometry.fontSize).toBeCloseTo(1.1, 1)

  const projects = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Mine prosjekter', exact: true }) })
  await projects.getByLabel('Prosjektnavn').fill('CV Maker')
  await projects.getByLabel('Teknologier Skill med komma eller ·').fill('React, TypeScript, PDF')
  await expect(document.locator('.cv-project')).toContainText('CV Maker')
  await expect(document.locator('.cv-project-tech')).toContainText('React')
  await projects.getByRole('button', { name: /Legg til/ }).click()
  await expect(projects.locator('.reorder-list article')).toHaveCount(2)

  const competence = page.locator('.competency-editor-section')
  await competence.getByRole('button', { name: 'Ny underoverskrift' }).click()
  await competence.getByLabel('Underoverskrift 1', { exact: true }).fill('Programmeringsspråk')
  await competence.getByLabel('Programmeringsspråk punkt 1').fill('Java')
  await competence.getByLabel('Programmeringsspråk punkt 2').fill('Python og et svært langt kompetansenavn som skal brytes over flere linjer uten å bli klippet')
  await expect(document.locator('.cv-sidebar')).toContainText('Programmeringsspråk')
  await expect(document.locator('.cv-sidebar')).toContainText('Python og et svært langt kompetansenavn')

  const experience = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Erfaring', exact: true }) })
  await experience.getByRole('button', { name: 'Nytt punkt' }).click()
  await experience.getByRole('textbox', { name: 'Erfaringspunkt 2', exact: true }).fill('Et eget punkt som dokumenterer ansvar og resultat.')
  await experience.getByRole('button', { name: 'Ny lenke' }).click()
  await experience.getByLabel('Erfaring 1 lenketekst 1').fill('Se bedriftens nettside')
  await experience.getByLabel('Erfaring 1 lenkeadresse 1').fill('https://example.no/karriere')
  await expect(document.locator('.cv-entry').first().locator('li')).toHaveCount(2)
  await expect(document.locator('.cv-entry').first()).toContainText('Et eget punkt som dokumenterer ansvar og resultat.')
  await expect(document.locator('a[href="https://example.no/karriere"]')).toContainText('Se bedriftens nettside')

  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgQCAZMYD9sAAAAASUVORK5CYII=', 'base64')
  const logoChooser = page.waitForEvent('filechooser')
  await experience.getByRole('button', { name: 'Bilde / bedriftslogo (valgfritt)' }).click()
  await (await logoChooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pixel })
  await expect(document.locator('.cv-entry-logo')).toHaveCount(1)
  await expect(experience.locator('.editor-item-image')).toHaveCount(1)

  const firstProject = projects.locator('.project-editor-card').first()
  await firstProject.getByRole('button', { name: 'Ny lenke' }).click()
  await firstProject.getByLabel('Prosjekt 1 lenketekst 1').fill('Åpne CV-appen')
  await firstProject.getByLabel('Prosjekt 1 lenkeadresse 1').fill('https://app.example.no/cv')
  await expect(document.locator('a[href="https://app.example.no/cv"]')).toContainText('Åpne CV-appen')
  const iconChooser = page.waitForEvent('filechooser')
  await firstProject.getByRole('button', { name: 'Prosjektbilde (valgfritt)' }).click()
  await (await iconChooser).setFiles({ name: 'project.png', mimeType: 'image/png', buffer: pixel })
  await expect(document.locator('.cv-project .cv-entry-logo')).toHaveCount(1)
  await firstProject.getByRole('button', { name: 'Nytt punkt' }).click()
  await firstProject.getByLabel('Prosjektpunkt 2', { exact: true }).fill('Leverte en dokumentert løsning med målbar effekt.')

  const education = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Utdanning', exact: true }) })
  await education.getByRole('button', { name: 'Nytt punkt' }).click()
  await education.getByLabel('Utdanningspunkt 2', { exact: true }).fill('Fordypning i tilgjengelige digitale tjenester.')
  const schoolLogoChooser = page.waitForEvent('filechooser')
  await education.getByRole('button', { name: 'Bilde / skolelogo (valgfritt)' }).click()
  await (await schoolLogoChooser).setFiles({ name: 'school.png', mimeType: 'image/png', buffer: pixel })
  await expect(document.locator('.cv-education-section .cv-entry-logo')).toHaveCount(1)

  const referenceSection = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Referanser', exact: true }) }).first()
  await referenceSection.locator('.reference-fields').getByLabel('Navn').fill('Kristian Olsen')
  await referenceSection.locator('.reference-fields').getByLabel('Rolle').fill('Teamleder')
  await page.getByRole('radio', { name: 'Hovedfelt' }).check()
  await expect(document.locator('.cv-main .cv-reference')).toHaveCount(1)
  await expect(document.locator('.cv-sidebar .cv-reference')).toHaveCount(0)
  await page.getByRole('radio', { name: 'Skjult' }).check()
  await expect(document.locator('.cv-reference')).toHaveCount(0)
  await page.getByRole('radio', { name: 'Sidefelt' }).check()
  await expect(document.locator('.cv-sidebar .cv-reference')).toHaveCount(1)

  await document.locator('.cv-contact a .editable').first().fill('ekstraordinært.langt.epostnavn.som.maa.brytes@example.no')
  await document.locator('.cv-contact a .editable').first().blur()
  await document.locator('.cv-contact a .editable').last().fill('https://www.linkedin.com/in/et-svaert-langt-profilnavn-som-skal-brytes-korrekt')
  await document.locator('.cv-contact a .editable').last().blur()

  await page.getByRole('button', { name: /Maler/ }).click()
  await page.getByLabel('Skriftstørrelse').selectOption('stor')
  await page.getByLabel('Avstand').selectOption('luftig')
  await page.getByLabel(/Sidemarg/).fill('25')
  await expect(document).toHaveAttribute('style', /--cv-font-body: 11.5pt/)
  await expect(document).toHaveAttribute('style', /--cv-margin: 25mm/)

  for (const template of ['Nordlys', 'Fjord', 'Klassisk', 'Signal', 'ATS Enkel', 'Europass', 'Harvard', 'Akademisk']) {
    await page.getByRole('button', { name: new RegExp(`^${template}`) }).click()
    const overflow = await document.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow, `${template} skal ikke ha horisontal overflow`).toBeLessThanOrEqual(1)
    const clippedFields = await document.locator('.cv-contact a, .cv-contact > span, .cv-side-block li, .cv-entry').evaluateAll((elements) => {
      const page = document.querySelector('#cv-document')?.getBoundingClientRect()
      if (!page) return ['Dokumentet mangler']
      return elements
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          return rect.left < page.left - 1 || rect.right > page.right + 1
        })
        .map((element) => element.textContent)
    })
    expect(clippedFields, `${template} skal bryte lange felt`).toEqual([])
    await expect(document.locator('.cv-skill-group')).toContainText('Programmeringsspråk')
    await expect(document.locator('.cv-project .cv-entry-logo')).toHaveCount(1)
    await expect(document.locator('.cv-education-section .cv-entry-logo')).toHaveCount(1)
    await expect(document.locator('.cv-education-section .cv-entry-bullets')).toContainText('Fordypning i tilgjengelige digitale tjenester.')
    await expect(document.locator('.cv-project .cv-entry-bullets').first()).toContainText('Leverte en dokumentert løsning med målbar effekt.')
    await expect(document.locator('a[href="https://example.no/karriere"]')).toContainText('Se bedriftens nettside')
    await expect(document.locator('a[href="https://app.example.no/cv"]')).toContainText('Åpne CV-appen')
    const mediaAlignment = await document.locator('.cv-entry-with-media').evaluateAll((entries) => entries.map((entry) => {
      const image = entry.querySelector('.cv-entry-logo')?.getBoundingClientRect()
      const heading = entry.querySelector('.cv-entry-head')?.getBoundingClientRect()
      return image && heading ? { imageRight: image.right, headingLeft: heading.left, topDifference: Math.abs(image.top - heading.top) } : null
    }))
    expect(mediaAlignment.every((item) => item && item.imageRight <= item.headingLeft && item.topDifference <= 3), `${template} skal plassere bilder til venstre for overskriften`).toBe(true)
    expect(mediaAlignment).toHaveLength(3)

    const contactAlignment = await document.locator('.cv-contact a, .cv-contact > span').evaluateAll((rows) => rows.map((row) => {
      const icon = row.querySelector('svg')?.getBoundingClientRect()
      const editable = row.querySelector('.editable')
      const firstTextNode = editable?.firstChild
      if (!icon || !icon.width || !firstTextNode) return null
      const range = document.createRange()
      range.setStart(firstTextNode, 0)
      range.setEnd(firstTextNode, Math.min(1, firstTextNode.textContent?.length ?? 0))
      const text = range.getBoundingClientRect()
      return Math.abs((icon.top + icon.height / 2) - (text.top + text.height / 2))
    }))
    const visibleContactIcons = contactAlignment.filter((difference): difference is number => difference !== null)
    expect(visibleContactIcons.every((difference) => difference <= 3), `${template} skal ha kontaktikoner på samme linje som teksten`).toBe(true)
    expect(visibleContactIcons).toHaveLength(template === 'Harvard' ? 0 : 4)

    const headingRuleGaps = await document.locator('.cv-section > h2').evaluateAll((headings) => headings
      .filter((heading) => getComputedStyle(heading).borderBottomWidth !== '0px')
      .map((heading) => {
        const firstTextNode = heading.firstChild
        if (!firstTextNode) return null
        const range = document.createRange()
        range.selectNodeContents(firstTextNode)
        const text = range.getBoundingClientRect()
        const box = heading.getBoundingClientRect()
        const border = Number.parseFloat(getComputedStyle(heading).borderBottomWidth)
        return box.bottom - border - text.bottom
      }))
    expect(headingRuleGaps.every((gap) => gap !== null && gap >= 2), `${template} skal ha luft mellom hovedoverskrift og linje`).toBe(true)

    const bulletGeometry = await document.locator('.cv-entry-bullets').evaluateAll((lists) => lists.map((list) => ({
      position: getComputedStyle(list).listStylePosition,
      aligned: Array.from(list.children).every((item) => {
        const editable = item.querySelector('.editable')?.getBoundingClientRect()
        const row = item.getBoundingClientRect()
        return Boolean(editable && Math.abs(editable.top - row.top) <= 2)
      }),
    })))
    expect(bulletGeometry.every((item) => item.position === 'outside' && item.aligned), `${template} skal holde punkt og første tekstlinje sammen`).toBe(true)
    if (testInfo.project.name === 'desktop') {
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: /Last ned PDF/ }).click()
      const download = await downloadPromise
      const path = await download.path()
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const pdf = await getDocument({ data: new Uint8Array(await readFile(path!)) }).promise
      expect(pdf.numPages, `${template} skal eksporteres over nødvendige A4-sider`).toBeGreaterThanOrEqual(2)
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const viewport = (await pdf.getPage(pageNumber)).getViewport({ scale: 1 })
        expect(viewport.width, `${template} side ${pageNumber} skal ha A4-bredde`).toBeCloseTo(595.28, 0)
        expect(viewport.height, `${template} side ${pageNumber} skal ha A4-høyde`).toBeCloseTo(841.89, 0)
      }
    }
    await document.screenshot({ path: `test-results/template-${template.toLowerCase().replace(/\s+/g, '-')}.png` })
  }
})

test('eldre lagrede CV-er migreres uten å få eksempelprosjekter', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Migreringen trenger bare én nettlesermotor')
  await page.addInitScript(() => {
    localStorage.setItem('cvklar-document', JSON.stringify({
      name: 'Ola Nordmann',
      title: 'Utvikler',
      email: 'ola@example.no',
      phone: '900 00 000',
      location: 'Oslo',
      website: '',
      summary: 'Erfaren utvikler.',
      skills: ['TypeScript'],
      experience: [],
      education: [],
      languages: [],
      references: ['Oppgis på forespørsel'],
      customSections: [],
      hiddenSections: [],
      hiddenContactFields: [],
      sidebarOrder: ['contact', 'skills', 'references'],
      photo: '',
      sectionOrder: ['summary', 'experience', 'education', 'skills'],
    }))
  })
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: 'Åpne CV' }).click()
  await expect(page.locator('#cv-document')).toContainText('Ola Nordmann')
  await expect(page.locator('#cv-document .cv-project')).toHaveCount(0)
  await expect(page.locator('#cv-document .cv-empty-section')).toContainText('Mine prosjekter')
  await expect(page.locator('#cv-document .cv-empty-section')).toContainText('legg til et prosjekt')
  await expect(page.locator('#cv-document .cv-reference')).toContainText('Oppgis på forespørsel')
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cvklar-document') ?? '{}'))
  expect(stored.projects).toEqual([])
  expect(stored.references[0]).toMatchObject({ text: 'Oppgis på forespørsel' })
  expect(stored.appearance).toMatchObject({ typeScale: 'standard', spaceScale: 'standard', margin: 20 })
  expect(stored.skillGroups).toEqual([])
  expect(stored.sidebarOrder).toContain('side-skills')
})

test('eldre prosjektlenker migreres til navngitte lenker', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Migreringen trenger bare nettlesermotorene som dekker desktop')
  await page.addInitScript(() => {
    localStorage.setItem('cvklar-document', JSON.stringify({
      name: 'Ola Nordmann',
      title: 'Utvikler',
      email: 'ola@example.no',
      phone: '',
      location: 'Oslo',
      website: '',
      summary: '',
      skills: [],
      experience: [],
      education: [],
      projects: [{
        id: 'legacy-project',
        title: 'Min app',
        subtitle: '',
        period: '',
        description: '- Bygget første versjon av appen. - Forbedret løsningen etter brukertesting.',
        technologies: [],
        url: 'https://app.example.no',
        githubUrl: 'https://github.com/example/app',
        image: '',
      }],
      languages: [],
      references: [],
      customSections: [],
      hiddenSections: [],
      hiddenContactFields: [],
      sidebarOrder: ['contact'],
      photo: '',
      sectionOrder: ['projects'],
    }))
  })

  await page.goto('/cv')
  const project = page.locator('#cv-document .cv-project')
  await expect(project).toContainText('Min app')
  await expect(project.locator('.cv-entry-bullets li')).toHaveCount(2)
  await expect(project).toContainText('Forbedret løsningen etter brukertesting.')
  await expect(project.locator('a[href="https://app.example.no"]')).toContainText('Åpne prosjekt')
  await expect(project.locator('a[href="https://github.com/example/app"]')).toContainText('GitHub')

  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('cvklar-document') ?? '{}')
    return stored.projects?.[0]?.links?.length
  })).toBe(2)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('cvklar-document') ?? '{}'))
  expect(stored.projects[0].links).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Åpne prosjekt', url: 'https://app.example.no' }),
    expect.objectContaining({ label: 'GitHub', url: 'https://github.com/example/app' }),
  ]))
  expect(stored.projects[0].url).toBe('')
  expect(stored.projects[0].githubUrl).toBe('')
  expect(stored.projects[0].description).toBe('')
  expect(stored.projects[0].bullets).toEqual([
    'Bygget første versjon av appen.',
    'Forbedret løsningen etter brukertesting.',
  ])
})
