export const acceptedImageTypes = 'image/png,image/jpeg,image/webp'

const allowed = new Set(['image/png', 'image/jpeg', 'image/webp'])

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Filen kunne ikke leses.'))
    reader.readAsDataURL(file)
  })

/**
 * Leser et bilde som data-URL og skalerer det ned. Bildene lagres sammen med CV-en
 * i nettleserens lokale dokumentlager og brukes som de er i PDF-en.
 */
export async function readImageFile(file: File, maxSize: number): Promise<string> {
  if (!allowed.has(file.type)) throw new Error('Velg et PNG-, JPG- eller WebP-bilde.')
  if (file.size > 6 * 1024 * 1024) throw new Error('Bildet er for stort. Velg en fil under 6 MB.')
  const dataUrl = await readAsDataUrl(file)
  const image = new Image()
  image.src = dataUrl
  try {
    await image.decode()
  } catch {
    return dataUrl
  }
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
  if (scale === 1 && dataUrl.length < 180_000) return dataUrl

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return dataUrl
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  // PNG beholder gjennomsiktige bedriftslogoer, foto komprimeres som JPEG.
  return file.type === 'image/jpeg' ? canvas.toDataURL('image/jpeg', 0.88) : canvas.toDataURL('image/png')
}
