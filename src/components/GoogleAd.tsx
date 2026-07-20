import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>
  }
}

type Props = {
  allowed: boolean
  slot?: string
}

const client = import.meta.env.VITE_GOOGLE_ADS_CLIENT?.trim()

export default function GoogleAd({ allowed, slot }: Props) {
  const requested = useRef(false)
  const configured = Boolean(client?.match(/^ca-pub-\d+$/) && slot?.match(/^\d+$/))

  useEffect(() => {
    if (!allowed || !configured || requested.current) return

    const requestAd = () => {
      if (requested.current) return
      requested.current = true
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-cvklar-adsense]')
    if (existing) {
      if (existing.dataset.loaded === 'true') requestAd()
      else existing.addEventListener('load', requestAd, { once: true })
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
    script.dataset.cvklarAdsense = 'true'
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      requestAd()
    }, { once: true })
    document.head.appendChild(script)
  }, [allowed, configured, slot])

  if (!configured || !allowed) return null

  return (
    <aside className="google-ad-shell" aria-label="Annonse fra Google">
      <span>ANNONSE</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
