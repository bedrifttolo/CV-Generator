const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

/**
 * Finner sideskift som ikke deler en enkelt erfaring, utdanning, prosjekt eller referanse i to.
 * Elementene merkes med data-cv-block i CV-dokumentet.
 */
function pageOffsets(element: HTMLElement, pageHeight: number) {
  const rect = element.getBoundingClientRect()
  const renderScale = element.offsetHeight ? rect.height / element.offsetHeight : 1
  const contentHeight = element.offsetHeight
  const blocks = Array.from(element.querySelectorAll<HTMLElement>('[data-cv-block]')).map((node) => {
    const box = node.getBoundingClientRect()
    return { top: (box.top - rect.top) / renderScale, bottom: (box.bottom - rect.top) / renderScale }
  })

  const offsets = [0]
  let guard = 0
  while (guard < 40) {
    guard += 1
    const start = offsets[offsets.length - 1]
    if (start + pageHeight >= contentHeight - 1) break
    let cut = start + pageHeight
    const straddling = blocks
      .filter((block) => block.top > start && block.top < cut && block.bottom > cut && block.bottom - block.top < pageHeight * 0.85)
      .map((block) => block.top)
    if (straddling.length) {
      const candidate = Math.min(...straddling)
      // Flytt bare sideskiftet dersom det ikke etterlater et stort tomrom.
      if (candidate > start + pageHeight * 0.3) cut = candidate - 2
    }
    offsets.push(cut)
  }
  return offsets
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
      // html2canvas håndterer eventuell feil videre uten å stoppe resten av eksporten.
    }
  }))
}

export async function exportCvPdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const captureRoot = element.closest<HTMLElement>('.cv-scale')
  captureRoot?.classList.add('cv-pdf-capture')

  try {
    await Promise.all([document.fonts?.ready ?? Promise.resolve(), waitForImages(element)])

    const width = element.offsetWidth
    const pageHeight = width * (A4_HEIGHT_MM / A4_WIDTH_MM)
    const offsets = pageOffsets(element, pageHeight)
    const contentHeight = element.offsetHeight
    const documentHeight = Math.ceil(Math.max(contentHeight, offsets[offsets.length - 1] + pageHeight))
    const rootRect = element.getBoundingClientRect()
    const renderScale = element.offsetHeight ? rootRect.height / element.offsetHeight : 1
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

    const previousHeight = element.style.height
    // Fyller siste side helt ut slik at bakgrunn og sidefelt ikke stopper midt på arket.
    element.style.height = `${documentHeight}px`
    element.classList.add('cv-exporting')

    let canvas: HTMLCanvasElement
    try {
      canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width,
        height: documentHeight,
        windowWidth: Math.max(document.documentElement.clientWidth, width),
      })
    } finally {
      element.classList.remove('cv-exporting')
      element.style.height = previousHeight
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pixelScale = canvas.width / width
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = Math.round(pageHeight * pixelScale)
    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('Nettleseren kunne ikke tegne PDF-siden.')

    offsets.forEach((offset, index) => {
      if (index) pdf.addPage()
      fillPageBackground(context, element, pageCanvas, pixelScale)
      const sourceTop = Math.round(offset * pixelScale)
      const nextOffset = offsets[index + 1] ?? Math.min(contentHeight, offset + pageHeight)
      const sourceHeight = Math.min(
        pageCanvas.height,
        Math.max(0, Math.round((nextOffset - offset) * pixelScale)),
        canvas.height - sourceTop,
      )
      if (sourceHeight > 0) {
        context.drawImage(canvas, 0, sourceTop, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
      }
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, `cv-page-${index}`, 'FAST')
      links
        .filter((link) => link.top < nextOffset && link.top + link.height > offset)
        .forEach((link) => {
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
    captureRoot?.classList.remove('cv-pdf-capture')
  }
}
