Aktivere Google Ads
Annonsen er ferdig koblet, men vises ikke før du har Google-ID-ene:
Opprett og få domenet godkjent i Google AdSense.
Opprett en responsiv Display-ad.
Legg disse variablene inn i Vercel under Settings → Environment Variables:
VITE_GOOGLE_ADS_CLIENT=ca-pub-1234567890123456
VITE_GOOGLE_ADS_SLOT_HOME=1234567890
Aktiver Privacy & messaging → European regulations i AdSense. Google krever en sertifisert CMP for annonsevisning i Norge/EØS. Google CMP-krav
Kopier public/ads.txt.example til public/ads.txt, og erstatt eksempel-ID-en med din publisher-ID. Google ads.txt-guide
Redeploy på Vercel.
Google-komponenten ligger i [GoogleAd.tsx (line 16)](/Users/thoma/Developer/CV-Generator/src/components/GoogleAd.tsx:16).
Den blokkerende statiske CSP-en er fjernet fordi AdSense bruker skiftende domener og Google bare støtter streng CSP med dynamiske nonces. De øvrige sikkerhetshodene er beholdt. Googles CSP-veiledning