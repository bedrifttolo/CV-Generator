import type { CvData, TemplateId, ThemeId } from '../types'

const DATABASE_NAME = 'cvklar-local'
const DATABASE_VERSION = 1
const STORE_NAME = 'documents'
const ACTIVE_DOCUMENT_KEY = 'active-cv'
const MAX_FULL_LEGACY_MIRROR_LENGTH = 1_000_000

export type CvSnapshot = {
  cv: CvData
  template: TemplateId
  theme: ThemeId
  updatedAt: number
}

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('Nettleseren støtter ikke lokal dokumentlagring.'))
    return
  }

  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('Kunne ikke åpne lokal dokumentlagring.'))
  request.onblocked = () => reject(new Error('Lokal dokumentlagring er blokkert av en annen fane.'))
})

const writeSnapshot = async (snapshot: CvSnapshot) => {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(snapshot, ACTIVE_DOCUMENT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Kunne ikke lagre CV-en lokalt.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Lokal lagring ble avbrutt.'))
    })
  } finally {
    database.close()
  }
}

let pendingSnapshot: CvSnapshot | undefined
let writeInProgress = false
const writeWaiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = []

const flushPendingSnapshots = async () => {
  let lastError: unknown
  while (pendingSnapshot) {
    const next = pendingSnapshot
    pendingSnapshot = undefined
    try {
      await writeSnapshot(next)
      lastError = undefined
    } catch (error) {
      lastError = error
    }
  }

  writeInProgress = false
  const completedWaiters = writeWaiters.splice(0)
  completedWaiters.forEach((waiter) => {
    if (lastError) waiter.reject(lastError)
    else waiter.resolve()
  })
}

/**
 * Samler raske tastetrykk i én etterfølgende transaksjon. Store bilder blir
 * dermed ikke skrevet på nytt for hvert eneste tegn, samtidig som siste versjon
 * alltid står igjen i køen.
 */
export function saveCvSnapshot(snapshot: CvSnapshot) {
  pendingSnapshot = snapshot
  const completed = new Promise<void>((resolve, reject) => {
    writeWaiters.push({ resolve, reject })
  })
  if (!writeInProgress) {
    writeInProgress = true
    void flushPendingSnapshots()
  }
  return completed
}

export async function loadCvSnapshot(): Promise<CvSnapshot | null> {
  const database = await openDatabase()
  try {
    return await new Promise<CvSnapshot | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(ACTIVE_DOCUMENT_KEY)
      request.onsuccess = () => resolve((request.result as CvSnapshot | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Kunne ikke lese den lokale CV-en.'))
    })
  } finally {
    database.close()
  }
}

const withoutLocalImages = (cv: CvData): CvData => ({
  ...cv,
  photo: cv.photo.startsWith('data:') ? '' : cv.photo,
  experience: cv.experience.map((entry) => ({
    ...entry,
    companyLogo: entry.companyLogo?.startsWith('data:') ? '' : entry.companyLogo,
  })),
  education: cv.education.map((entry) => ({
    ...entry,
    schoolLogo: entry.schoolLogo?.startsWith('data:') ? '' : entry.schoolLogo,
  })),
  projects: cv.projects.map((project) => ({
    ...project,
    image: project.image?.startsWith('data:') ? '' : project.image,
  })),
})

export type LegacyMirrorResult = 'full' | 'without-images' | 'failed'

/**
 * Beholder gammel lagring lesbar og gir en umiddelbar tekst-backup. Når
 * localStorage-kvoten er brukt opp, lagres kopien uten lokale bilder; den
 * komplette modellen ligger fortsatt i IndexedDB.
 */
export function saveLegacyCvMirror(cv: CvData, template: TemplateId, theme: ThemeId): LegacyMirrorResult {
  const serialized = JSON.stringify(cv)
  let result: LegacyMirrorResult = 'without-images'
  if (serialized.length <= MAX_FULL_LEGACY_MIRROR_LENGTH) {
    try {
      localStorage.setItem('cvklar-document', serialized)
      result = 'full'
    } catch {
      // Prøv den mindre speilkopien nedenfor.
    }
  }
  if (result !== 'full') {
    try {
      localStorage.setItem('cvklar-document', JSON.stringify(withoutLocalImages(cv)))
    } catch {
      result = 'failed'
    }
  }

  try {
    localStorage.setItem('cvklar-template', template)
    localStorage.setItem('cvklar-theme', theme)
  } catch {
    // Mal og tema ligger også i IndexedDB-snapshotet.
  }
  return result
}
