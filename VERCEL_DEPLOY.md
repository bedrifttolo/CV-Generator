# Publiser CVklar på Vercel

Prosjektet bruker Vite-frontend og to Vercel Functions. `vercel.json` inneholder eksplisitt Vite-build, SPA-rewrite og sikkerhetshoder, og produksjonsbygget skrives til `dist/`.

## Anbefalt: GitHub og Vercel Dashboard

1. Kontroller lokalt:

   ```bash
   npm install
   npm run build
   npm run test:server
   npm run test:e2e
   ```

2. Commit og push endringene til GitHub-repoet `bedrifttolo/CV-Generator`.

3. Gå til [vercel.com/new](https://vercel.com/new), logg inn med GitHub og velg `CV-Generator`.

4. Kontroller prosjektinnstillingene før du trykker **Deploy**:

   - Framework Preset: `Vite`
   - Node.js Version: `22.x` (også låst i `package.json`)
   - Root Directory: `./`
   - Install Command: `npm install` eller Vercels standard
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: legg inn `OPENAI_API_KEY` som serverhemmelighet hvis AI-funksjonene skal aktiveres, og AdSense-verdiene nedenfor når Google har godkjent nettstedet

5. Åpne den genererte `*.vercel.app`-adressen og test:

   - «Start fra scratch» uten filopplasting
   - valgfri import av CV
   - malbytte og direkte redigering
   - profilbilde
   - CV- og søknadsbrev-PDF
   - URL-import, manuell stilling, frist og søknadsstatus
   - direkte åpning av `/soknadsbrev?job=…`
   - lokal fallback og eventuelle konfigurerte AI-handlinger
   - mobilvisning

Når Git-integrasjonen er aktiv, blir push til `main` produksjon. Andre grener og pull requests får egne Preview Deployments.

## Alternativ: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel link
vercel
```

Den siste kommandoen lager en preview. Publiser godkjent versjon til produksjon med:

```bash
vercel --prod
```

## Eget domene

I Vercel-prosjektet åpner du **Settings → Domains**, legger til domenet og følger DNS-verdiene Vercel viser. Legg til både hoveddomene og `www` hvis begge skal virke, og velg hvilket som skal videresende til det andre.

Vercel oppretter SSL-sertifikat automatisk etter at DNS er verifisert. Bruk alltid DNS-verdiene som vises for akkurat ditt prosjekt.

## Google AdSense

1. Publiser først nettstedet på et eget domene og legg domenet til i Google AdSense.
2. Vent til Google har godkjent nettstedet.
3. Opprett en responsiv **Display ad unit** i AdSense og kopier publisher-ID og slot-ID.
4. I Vercel åpner du **Project → Settings → Environment Variables** og legger inn:

   ```text
   VITE_GOOGLE_ADS_CLIENT=ca-pub-1234567890123456
   VITE_GOOGLE_ADS_SLOT_HOME=1234567890
   ```

   Variablene er offentlige identifikatorer som blir synlige i nettleseren. Ikke legg private API-nøkler i `VITE_`-variabler.

5. Aktiver **Privacy & messaging → European regulations** i AdSense. Norge er i EØS, og Google krever en Google-sertifisert CMP med IAB TCF for annonsevisning i EØS, Storbritannia og Sveits. Det innebygde CVklar-banneret alene erstatter ikke denne sertifiserte CMP-en.
6. Kopier `public/ads.txt.example` til `public/ads.txt`, erstatt eksempel-ID-en med publisher-ID-en fra kontoen og push filen. Kontroller at `https://dittdomene.no/ads.txt` returnerer filen med HTTP 200.
7. Redeploy prosjektet. Annonsen på forsiden lastes først etter markedsføringssamtykke.

Google anbefaler `ads.txt`, selv om filen ikke er obligatorisk. Bruk alltid den eksakte linjen Google viser i AdSense-kontoen.

## OpenAI på server

Legg `OPENAI_API_KEY` inn for Production, Preview og Development etter behov. Nøkkelen skal ikke ligge i `.env` som committes og skal aldri ha `VITE_`-prefiks. Valgfri `OPENAI_MODEL` har standardverdi `gpt-5.4-mini`.

Etter deploy kan du verifisere at en privat adresse stoppes:

```bash
curl -X POST https://ditt-domene.no/api/jobs/import \
  -H 'Content-Type: application/json' \
  --data '{"url":"http://127.0.0.1/private"}'
```

Forvent `BLOCKED_URL`. Uten OpenAI-nøkkel skal `/api/ai/job-assistant` returnere `AI_NOT_CONFIGURED`, og klienten bruker lokal relevanssjekk.

## Redigere forsiden

- Tekst, seksjoner og rekkefølge: `src/App.tsx`, hovedsakelig komponenten `Home`.
- Det tegnede CV-eksemplet i hero: `HeroDocument` i `src/App.tsx`.
- Farger, avstander, mobilvisning og hero-layout: `src/index.css` under `.hero`, `.hero-copy` og `.hero-visual`.
- Malnavn, beskrivelser og fargetemaer: `src/data.ts`.
- Google-annonsen: `src/components/GoogleAd.tsx`.

Kjør `npm run dev` mens du redigerer. Endringer vises direkte på `http://localhost:4173`.

## Før kommersiell lansering

- Bytt ut e-post, foretaksnavn, organisasjonsnummer og kontaktinformasjon i personvern og vilkår.
- Koble ikke en AI-nøkkel eller annonsehemmelighet direkte til Vite/React. Alt som prefikses med `VITE_` blir tilgjengelig i nettleseren.
- Vurder serverstyrt rate limiting, kostnadstak og sterkere misbruksvern før stor offentlig AI-bruk.
- Aktiver ikke Google AdSense før Google-sertifisert CMP, leverandørinformasjon, personverntekst og faktisk annonse-ID er på plass.
- Test sikkerhetshodene på produksjonsadressen etter deploy.
- AdSense bruker skiftende annonse-domener. Den tidligere blokkerende CSP-en er derfor fjernet fra den statiske Vercel-konfigurasjonen; øvrige sikkerhetshoder er beholdt. En streng CSP for AdSense krever dynamiske nonces på serversiden.

## Vanlige feil

- **Blank side:** Kontroller at Output Directory er `dist` og at bygget fullføres.
- **404 etter navigasjon/oppdatering:** Bekreft at `vercel.json` ligger i prosjektroten.
- **PDF-import virker ikke:** Kontroller i nettleserkonsollen at PDF-worker lastes fra samme domene og ikke blokkeres av en manuelt endret CSP.
- **Gammel versjon vises:** Åpne Deployments i Vercel og kontroller at riktig commit er merket Production.
