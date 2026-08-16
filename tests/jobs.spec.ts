import { expect, test } from '@playwright/test'

const importedJob = {
  title: 'Frontend-utvikler',
  company: 'Eksempel AS',
  location: 'Bergen',
  deadline: '2026-08-28',
  deadlineType: 'date',
  employmentType: 'Fast',
  source: 'finn',
  sourceUrl: 'https://www.finn.no/job/123',
  description: 'Bygg gode digitale tjenester.',
  originalText: 'Vi søker en frontend-utvikler med React, TypeScript og samarbeid.',
  responsibilities: ['Bygge tilgjengelige brukerflater'],
  requiredQualifications: ['React', 'TypeScript'],
  preferredQualifications: [],
  skills: ['React', 'TypeScript'],
  technologies: ['React', 'TypeScript'],
  benefits: [],
  contactPersons: [],
  jobAnalysis: {
    coreRequirements: ['React', 'TypeScript'], importantSkills: ['React'], technologies: ['React', 'TypeScript'],
    softSkills: ['Samarbeid'], responsibilities: ['Bygge tilgjengelige brukerflater'], keywords: ['React', 'TypeScript'], recommendedFocus: [],
  },
}

test('jobb kan importeres, lagres, spores og åpnes i søknadsstudio', async ({ page }, testInfo) => {
  await page.route('**/api/jobs/import', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job: importedJob }) }))
  await page.goto('/stillinger')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await expect(page.getByRole('heading', { name: /Jobber du vurderer/ })).toBeVisible()
  await page.getByLabel('Legg til fra lenke').fill(importedJob.sourceUrl)
  await page.getByRole('button', { name: /Hent annonse/ }).click()
  await expect(page.getByRole('dialog', { name: /Vi fant følgende/ })).toBeVisible()
  await expect(page.getByLabel('Stilling *')).toHaveValue('Frontend-utvikler')
  await expect(page.getByLabel('Virksomhet *')).toHaveValue('Eksempel AS')
  await page.getByRole('button', { name: /Lagre stilling/ }).click()

  const drawer = page.locator('.job-drawer')
  await expect(drawer.getByRole('heading', { name: 'Frontend-utvikler' })).toBeVisible()
  await expect(drawer.getByText(/12 dager igjen/)).toBeVisible()
  await page.getByRole('button', { name: /Lukk/ }).click()
  await expect(drawer).toBeHidden()
  await page.waitForTimeout(350)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-jobs.png`, fullPage: true })
  const card = page.locator('.job-card').filter({ hasText: 'Frontend-utvikler' })
  await card.getByRole('button', { name: /Marker som søkt/ }).click()
  await card.getByLabel('Når søkte du?').fill('2026-08-16')
  await card.getByRole('button', { name: /Lagre/ }).click()
  await expect(card).toContainText('Søkt 16. august')
  await card.getByRole('button', { name: /Lag søknad/ }).click()

  await expect(page).toHaveURL(/\/soknadsbrev\?job=job-/)
  await expect(page.getByLabel('Stillingen du søker på')).toHaveValue(/job-/)
  await expect(page.locator('.selected-job-summary')).toContainText('Eksempel AS')
  await page.waitForTimeout(350)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-job-letter.png`, fullPage: true })
  await page.getByLabel('Rediger søknadsbrev').fill('Min målrettede søknad.')
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('cvklar-cover-letters') || '[]')[0]?.content)).toBe('Min målrettede søknad.')
  await page.reload()
  await expect(page.getByLabel('Rediger søknadsbrev')).toHaveValue('Min målrettede søknad.')
})

test('AI-kall sender bare sanitert kandidatprofil og kan bruke strukturert svar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Payload-kontroll kjøres én gang')
  let posted: Record<string, unknown> | undefined
  await page.addInitScript((job) => {
    localStorage.setItem('cvklar-jobs', JSON.stringify([{ ...job, id: 'job-safe', status: 'saved', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]))
    localStorage.setItem('cvklar-document', JSON.stringify({
      name: 'Privat Navn', title: 'Utvikler', email: 'privat@example.no', phone: '99999999', location: 'Hemmelig sted', website: '',
      summary: 'Utvikler med erfaring fra React.', skills: ['React'],
      experience: [{ id: 'exp', role: 'Utvikler', company: 'Demo', period: '2024–nå', bullets: ['Bygget React-løsninger.'] }],
      education: [], projects: [], languages: ['Norsk'], references: [], referencePlacement: 'hidden', customSections: [], hiddenSections: [],
      hiddenContactFields: [], sidebarOrder: ['contact'], photo: 'data:image/png;base64,privat', sectionOrder: ['summary'], appearance: { typeScale: 'standard', spaceScale: 'standard', margin: 20 },
    }))
  }, importedJob)
  await page.route('**/api/ai/job-assistant', async (route) => {
    posted = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: {
      strongMatches: [{ requirement: 'React', evidence: 'Dokumentert i erfaring.' }], partialMatches: [], missingRequirements: ['Azure'],
      experiencesToHighlight: ['Utvikler hos Demo'], projectsToHighlight: [], keywordsToUse: ['React'],
      advice: ['Vis et konkret React-eksempel.'], suggestedOpening: '', letter: '',
    } }) })
  })
  await page.goto('/soknadsbrev?job=job-safe')
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.getByRole('button', { name: 'Analyser treff' }).click()
  await expect(page.getByText('Vis et konkret React-eksempel.')).toBeVisible()
  expect(posted).toBeTruthy()
  const serializedCandidate = JSON.stringify(posted?.candidate)
  expect(serializedCandidate).not.toContain('privat@example.no')
  expect(serializedCandidate).not.toContain('99999999')
  expect(serializedCandidate).not.toContain('Hemmelig sted')
  expect(serializedCandidate).not.toContain('Privat Navn')
  expect(serializedCandidate).not.toContain('data:image')
  expect(serializedCandidate).toContain('React')
})
