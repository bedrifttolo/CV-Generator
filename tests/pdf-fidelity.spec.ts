import { expect, test } from '@playwright/test'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { readFile } from 'node:fs/promises'

type RgbaImage = { width: number; height: number; data: Uint8ClampedArray }

async function decodePng(buffer: Buffer): Promise<RgbaImage> {
  const image = await loadImage(buffer)
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data }
}

async function renderFirstPdfPage(buffer: Buffer, targetWidth: number): Promise<RgbaImage> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise
  const page = await pdf.getPage(1)
  const unscaled = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: targetWidth / unscaled.width })
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height))
  const context = canvas.getContext('2d')
  await page.render({ canvas, canvasContext: context as never, viewport }).promise
  return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data }
}

function imageDifference(first: RgbaImage, second: RgbaImage) {
  const width = Math.min(first.width, second.width)
  const height = Math.min(first.height, second.height)
  let channelDifference = 0
  let visiblyDifferentPixels = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const firstIndex = (y * first.width + x) * 4
      const secondIndex = (y * second.width + x) * 4
      const difference = Math.max(
        Math.abs(first.data[firstIndex] - second.data[secondIndex]),
        Math.abs(first.data[firstIndex + 1] - second.data[secondIndex + 1]),
        Math.abs(first.data[firstIndex + 2] - second.data[secondIndex + 2]),
      )
      channelDifference += difference
      if (difference > 24) visiblyDifferentPixels += 1
    }
  }

  const pixels = width * height
  return {
    meanDifference: channelDifference / pixels,
    visiblyDifferentRatio: visiblyDifferentPixels / pixels,
  }
}

test('nedlastet PDF bruker samme visuelle geometri som forhåndsvisningen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Pikseltesten bruker full A4-bredde')
  test.setTimeout(60_000)
  await page.goto(`${process.env.CV_FIDELITY_URL ?? ''}/cv`)
  const consent = page.getByRole('button', { name: 'Kun nødvendig' })
  if (await consent.isVisible()) await consent.click()
  await page.evaluate(() => document.fonts.ready)

  const document = page.locator('#cv-document')
  await expect(document).toBeVisible()
  const captureStyles = await page.addStyleTag({ content: `
    html, body, #root, .app-shell, .builder-shell, .builder-layout, .preview-stage {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .site-header, .builder-topbar, .builder-panel, .preview-label { display: none !important; }
    .preview-stage { padding: 0 !important; }
  ` })
  await page.locator('.cv-scale').evaluate((element) => element.classList.add('cv-pdf-capture'))
  await document.evaluate((element) => element.classList.add('cv-exporting'))
  const preview = await document.screenshot()
  await document.evaluate((element) => element.classList.remove('cv-exporting'))
  await page.locator('.cv-scale').evaluate((element) => element.classList.remove('cv-pdf-capture'))
  await captureStyles.evaluate((element) => element.remove())

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Last ned PDF/ }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()

  const previewImage = await decodePng(preview)
  const pdfImage = await renderFirstPdfPage(await readFile(path!), previewImage.width)
  const difference = imageDifference(previewImage, pdfImage)

  expect(pdfImage.width).toBe(previewImage.width)
  expect(Math.abs(pdfImage.height - previewImage.height)).toBeLessThanOrEqual(1)
  expect(difference.meanDifference).toBeLessThan(10)
  expect(difference.visiblyDifferentRatio).toBeLessThan(0.08)
})
