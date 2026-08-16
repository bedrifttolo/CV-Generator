import type { CvData } from '../types'
import { encodeCvPdfPayload } from './cv-payload'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const EXPORT_PIXEL_RATIO = 2
// Safari og Chromium har grenser for hvor store bitmapper de kan opprette. En
// lavere pikselratio påvirker bare oppløsningen, aldri CV-ens CSS-geometri.
const MAX_EXPORT_BITMAP_EDGE = 15_000

/**
 * Finner sideskift som ikke deler en enkelt erfaring, utdanning, prosjekt eller referanse i to.
 * Elementene merkes med data-cv-block i CV-dokumentet.
 */
type LayoutBlock = { top: number; bottom: number }

function pageOffsets(element: HTMLElement, scope: HTMLElement, pageHeight: number, contentHeight: number) {
  const rect = element.getBoundingClientRect()
  const renderScale = element.offsetHeight ? rect.height / element.offsetHeight : 1
  const relativeBox = (node: HTMLElement): LayoutBlock => {
    const box = node.getBoundingClientRect()
    return { top: (box.top - rect.top) / renderScale, bottom: (box.bottom - rect.top) / renderScale }
  }
  const blocks = Array.from(scope.querySelectorAll<HTMLElement>(
    '[data-cv-block], [data-cv-fragment], .cv-contact-section, .cv-side-block > ul > li',
  )).map(relativeBox)

  // En seksjonsoverskrift skal ikke stå alene nederst på siden. Intervallet fra
  // overskriften til første innholdskort behandles derfor som én liten blokk.
  scope.querySelectorAll<HTMLElement>('.cv-section, .cv-side-block').forEach((section) => {
    const heading = section.querySelector<HTMLElement>(':scope > h2')
    const firstContent = section.querySelector<HTMLElement>('[data-cv-block], .cv-skill-group, li, .cv-reference')
    if (!heading || !firstContent) return
    const headingBox = relativeBox(heading)
    const contentBox = relativeBox(firstContent)
    blocks.push({ top: headingBox.top, bottom: contentBox.bottom })
  })

  const avoid = blocks
    .filter((block) => block.bottom > block.top && block.bottom - block.top < pageHeight * 0.96)
    .sort((a, b) => a.top - b.top)

  const offsets = [0]
  let guard = 0
  while (guard < 80) {
    guard += 1
    const start = offsets[offsets.length - 1]
    if (start + pageHeight >= contentHeight - 1) break
    let cut = start + pageHeight
    const minimumFill = start + pageHeight * 0.22

    // Et flyttet sideskift kan treffe en tidligere blokk i samme kolonne.
    // Kontroller derfor det nye kuttet på nytt til hele kolonnen er trygg.
    for (let pass = 0; pass < 80; pass += 1) {
      const straddling = avoid.filter((block) =>
        block.top > minimumFill && block.top < cut - 0.5 && block.bottom > cut + 0.5,
      )
      if (!straddling.length) break
      const candidate = Math.min(...straddling.map((block) => block.top)) - 1
      if (candidate >= cut - 0.5) break
      cut = candidate
    }
    offsets.push(Math.max(start + 1, cut))
  }
  return offsets
}

function contentBottom(element: HTMLElement, scope: HTMLElement) {
  const rootRect = element.getBoundingClientRect()
  const renderScale = element.offsetHeight ? rootRect.height / element.offsetHeight : 1
  const visibleChildren = Array.from(scope.children).filter((node): node is HTMLElement =>
    node instanceof HTMLElement && getComputedStyle(node).display !== 'none',
  )
  if (!visibleChildren.length) return 0
  return Math.max(...visibleChildren.map((node) => (node.getBoundingClientRect().bottom - rootRect.top) / renderScale))
}

type PageFlow = {
  left: number
  width: number
  contentHeight: number
  offsets: number[]
}

function fillPageBackground(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  pageCanvas: HTMLCanvasElement,
  pixelScale: number,
) {
  const rootRect = element.getBoundingClientRect()
  const fill = (node: HTMLElement | null, extendColumn = false) => {
    if (!node) return
    const color = getComputedStyle(node).backgroundColor
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return
    const rect = node.getBoundingClientRect()
    const left = Math.max(0, (rect.left - rootRect.left) * pixelScale)
    const width = Math.min(pageCanvas.width - left, rect.width * pixelScale)
    const height = extendColumn ? pageCanvas.height : Math.min(pageCanvas.height, rect.height * pixelScale)
    context.fillStyle = color
    context.fillRect(left, 0, width, height)
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
  fill(element, true)
  fill(element.querySelector<HTMLElement>('.cv-main'), true)

  const sidebar = element.querySelector<HTMLElement>('.cv-sidebar')
  if (sidebar && sidebar.getBoundingClientRect().width < rootRect.width * 0.75) fill(sidebar, true)
}

const waitForImages = async (element: HTMLElement) => {
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth > 0) return
    try {
      await image.decode()
    } catch {
      // En ugyldig valgfrifri logo skal ikke stoppe resten av eksporten.
    }
  }))
}

const waitForStableLayout = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
})

async function renderDocumentCanvas(element: HTMLElement, width: number, height: number) {
  const { getFontEmbedCSS, toCanvas } = await import('html-to-image')
  const pixelRatio = Math.max(
    1,
    Math.min(EXPORT_PIXEL_RATIO, MAX_EXPORT_BITMAP_EDGE / width, MAX_EXPORT_BITMAP_EDGE / height),
  )

  // html-to-image lar nettleserens egen layoutmotor tegne en klone av DOM-en i
  // SVG foreignObject. Dermed får PDF-en de samme tekstmetrikker, listemarkører
  // og SVG-posisjoner som forhåndsvisningen, i stedet for en ny tolkning av CSS.
  let fontEmbedCSS: string | undefined
  try {
    fontEmbedCSS = await getFontEmbedCSS(element, { preferredFontFormat: 'woff2' })
  } catch {
    // Systemfontene i malene er fortsatt tilgjengelige dersom en ekstern
    // fontserver er utilgjengelig. Eksporten skal ikke feile av den grunn.
  }

  return toCanvas(element, {
    width,
    height,
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: true,
    fontEmbedCSS,
    preferredFontFormat: 'woff2',
    skipAutoScale: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      minHeight: `${height}px`,
      maxHeight: 'none',
      margin: '0',
      overflow: 'hidden',
      transform: 'none',
      transformOrigin: 'top left',
    },
  })
}

export async function exportCvPdf(element: HTMLElement, fileName: string, data: CvData) {
  const { jsPDF } = await import('jspdf')
  const captureRoot = element.closest<HTMLElement>('.cv-scale')
  captureRoot?.classList.add('cv-pdf-capture')
  element.classList.add('cv-exporting')

  try {
    await Promise.all([document.fonts?.ready ?? Promise.resolve(), waitForImages(element)])
    await waitForStableLayout()

    const width = element.offsetWidth
    const pageHeight = width * (A4_HEIGHT_MM / A4_WIDTH_MM)
    const contentHeight = Math.max(element.offsetHeight, element.scrollHeight)
    const rootRect = element.getBoundingClientRect()
    const renderScale = element.offsetHeight ? rootRect.height / element.offsetHeight : 1
    const sidebar = element.querySelector<HTMLElement>('.cv-sidebar')
    const main = element.querySelector<HTMLElement>('.cv-main')
    const isTwoColumn = getComputedStyle(element).display === 'grid' && Boolean(sidebar && main) &&
      (sidebar?.getBoundingClientRect().width ?? width) < rootRect.width * 0.75
    const scopes = isTwoColumn && sidebar && main ? [sidebar, main] : [element]
    const flows: PageFlow[] = scopes.map((scope) => {
      const scopeRect = scope.getBoundingClientRect()
      const scopedHeight = isTwoColumn ? contentBottom(element, scope) : contentHeight
      return {
        left: (scopeRect.left - rootRect.left) / renderScale,
        width: scopeRect.width / renderScale,
        contentHeight: scopedHeight,
        offsets: pageOffsets(element, scope, pageHeight, scopedHeight),
      }
    })
    const pageCount = Math.max(...flows.map((flow) => flow.offsets.length))
    const documentHeight = Math.ceil(contentHeight)
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]')).map((anchor) => {
      const rect = anchor.getBoundingClientRect()
      return {
        href: anchor.href,
        left: (rect.left - rootRect.left) / renderScale,
        top: (rect.top - rootRect.top) / renderScale,
        width: rect.width / renderScale,
        height: rect.height / renderScale,
      }
    })

    const canvas = await renderDocumentCanvas(element, width, documentHeight)

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    pdf.setProperties({
      title: `${data.name} – CV`,
      subject: encodeCvPdfPayload(data),
      author: data.name,
      creator: 'CVklar',
      keywords: 'CVklar, CV, resume',
    })
    const pixelScale = canvas.width / width
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = Math.round(pageHeight * pixelScale)
    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('Nettleseren kunne ikke tegne PDF-siden.')

    Array.from({ length: pageCount }, (_, index) => index).forEach((index) => {
      if (index) pdf.addPage()
      fillPageBackground(context, element, pageCanvas, pixelScale)
      flows.forEach((flow) => {
        const offset = flow.offsets[index]
        if (offset === undefined || offset >= flow.contentHeight) return
        const nextOffset = flow.offsets[index + 1] ?? Math.min(flow.contentHeight, offset + pageHeight)
        const sourceLeft = Math.round(flow.left * pixelScale)
        const sourceTop = Math.round(offset * pixelScale)
        const sourceWidth = Math.min(Math.round(flow.width * pixelScale), canvas.width - sourceLeft)
        const sourceHeight = Math.min(
          pageCanvas.height,
          Math.max(0, Math.round((nextOffset - offset) * pixelScale)),
          canvas.height - sourceTop,
        )
        if (sourceWidth > 0 && sourceHeight > 0) {
          context.drawImage(
            canvas,
            sourceLeft,
            sourceTop,
            sourceWidth,
            sourceHeight,
            sourceLeft,
            0,
            sourceWidth,
            sourceHeight,
          )
        }
      })
      // PNG bevarer tekstkanter og logoer uten JPEG-artefakter. PDF-strømmen
      // komprimeres fortsatt av jsPDF, men den visuelle siden skaleres ikke.
      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, `cv-page-${index}`, 'FAST')
      links.forEach((link) => {
        const flow = flows.find((item) => link.left >= item.left - 1 && link.left < item.left + item.width + 1) ?? flows[0]
        const offset = flow.offsets[index]
        if (offset === undefined) return
        const nextOffset = flow.offsets[index + 1] ?? Math.min(flow.contentHeight, offset + pageHeight)
        if (link.top >= nextOffset || link.top + link.height <= offset) return
        const mmPerPixel = A4_WIDTH_MM / width
        pdf.link(
          link.left * mmPerPixel,
          Math.max(0, link.top - offset) * mmPerPixel,
          link.width * mmPerPixel,
          link.height * mmPerPixel,
          { url: link.href },
        )
      })
    })

    pdf.save(fileName)
  } finally {
    element.classList.remove('cv-exporting')
    captureRoot?.classList.remove('cv-pdf-capture')
  }
}
