import { expect, test } from '@playwright/test'

test('forside og CV-arbeidsbord fungerer', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('fonts.googleapis.com')) errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /CV-en som får frem/i })).toBeVisible()
  await expect(page.getByText('Behandles lokalt')).toHaveCount(0)
  await expect(page.getByLabel('Google-annonse')).toBeVisible()
  await page.getByRole('button', { name: 'Kun nødvendig' }).click()

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Vis meny' }).click()
    await expect(page.getByRole('navigation')).toBeVisible()
    await page.getByRole('button', { name: 'Vis meny' }).click()
  }
  await page.getByRole('button', { name: /Start fra scratch/ }).click()

  await expect(page.getByLabel('Redigerbar CV-forhåndsvisning')).toBeVisible()
  await expect(page.getByText('Lagret lokalt')).toHaveCount(0)
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

test('gammelt personlig eksempel erstattes med fiktive standarddata', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Migreringen trenger bare én nettlesermotor')
  await page.addInitScript(() => {
    localStorage.setItem('cvklar-document', JSON.stringify({
      name: 'Thomas Tolo Jensen',
      email: 'thomastj278@gmail.com',
      website: 'tolojensentech.no',
    }))
  })
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: 'Åpne CV' }).click()
  await expect(page.locator('#cv-document')).toContainText('Kari Nordmann')
  await expect(page.locator('#cv-document')).not.toContainText('Thomas Tolo Jensen')
})

test('CV-import trekker ut data og PDF kan lastes ned', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Eksport testes én gang i desktopmotoren')
  await page.goto('/')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: /Start fra scratch/ }).click()
  await page.locator('input[accept=".pdf,.docx,.txt"]').setInputFiles({
    name: 'ola-cv.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(`Ola Nordmann\nFrontend-utvikler\nola@example.no\n+47 999 88 777\n\nProfil\nUtvikler som lager tilgjengelige og raske tjenester for norske brukere.\n\nFerdigheter\nReact, TypeScript, universell utforming\n\nArbeidserfaring\nFrontend-utvikler – Eksempel AS\n2022 – nå\nForbedret lastetid med 40 prosent.\n\nUtdanning\nBachelor i informatikk\nUniversitetet i Oslo\n2019 – 2022`),
  })
  await expect(page.getByText(/Ferdig! Kontroller/)).toBeVisible()
  await expect(page.locator('#cv-document')).toContainText('Ola Nordmann')
  await expect(page.locator('#cv-document')).toContainText('ola@example.no')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Last ned PDF/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('Ola_Nordmann_CV.pdf')
})
