# CVklar — norsk CV- og søknadsbygger

CVklar er en lokal-først React-app der brukeren kan bygge CV, samle stillinger, følge søknadsstatus og skrive målrettede søknadsbrev. Dokumenter og stillingsoversikt lagres i nettleseren; sikre Vercel-funksjoner brukes bare ved URL-import og valgfrie AI-handlinger.

Nettsiden bruker bare fiktive eksempeldata og et nøytralt illustrert profilbilde. Den opprinnelige LaTeX-generatoren ligger separat i prosjektet og brukes ikke som eksempelinnhold i nettsiden.

## Start nettsiden

Krav: Node.js 22+ og npm.

```bash
npm install
npm run dev
```

Åpne `http://localhost:4173`. Produksjonsbygg:

```bash
npm run build
npm run preview
```

Bygget skrives til `dist/`. Hele funksjonssettet bør publiseres på Vercel eller en host som støtter Node-baserte API-ruter. `vercel.json` inneholder eksplisitt Vite-build, SPA-rewrite, clickjacking-beskyttelse, MIME-beskyttelse, referrer-policy og begrenset permissions-policy.

Se [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) for komplett publiseringsguide, domeneoppsett og sjekkliste før lansering.

## Hva som virker

- Import av PDF, DOCX og TXT, maks 10 MB. Teksten leses lokalt i nettleseren.
- Heuristisk uttrekk av navn, kontaktdata, profil, erfaring, utdanning, kompetanse og språk.
- Direkte `contentEditable`-redigering i CV-arket og automatisk lokal lagring.
- Legg til, slett, dra og flytt erfaring og utdanning direkte i dokumentpanelet.
- Vis, skjul og sorter alle hovedfelt og sidefelt, inkludert kontakt, kompetanse, språk og referanser.
- Lag egne seksjoner fra fritekst eller forslag som kurs, sertifiseringer, prosjekter og frivillig arbeid.
- Profilbilde, lenker, åtte maler, fem fargetemaer og responsiv forhåndsvisning.
- Lokal, regelbasert «Ansettbar AI» med bransjeord, treff mot annonsetekst og åpne NAV-kilder.
- Lokal stillingsoversikt med import-preview, manuell oppretting, frister, filtre, sortering, status og søknadsdato.
- Generisk URL-import med JSON-LD/metadata-fallback, renset annonsetekst og SSRF-beskyttelse i `/api/jobs/import`.
- Søknadsbrev per stilling, direkte URL-valg, lokal relevanssjekk, valgfrie AI-råd og lokal PDF-eksport.
- Norsk guide, personvernerklæring, vilkår, samtykkebanner og Google AdSense-komponent.

## AI-konfigurasjon

Kopier relevante verdier fra `.env.example`. `OPENAI_API_KEY` skal bare settes som serverhemmelighet lokalt eller i Vercel, aldri med `VITE_`-prefiks. Standardmodell er `gpt-5.4-mini` og kan overstyres med `OPENAI_MODEL`.

Uten nøkkel fortsetter URL-import, stillingsoversikt, lokal analyse og lokalt førsteutkast å virke. AI-knappene forklarer at modellen ikke er konfigurert og viser lokal relevanssjekk i stedet.

## Sikkerhet og produksjonsgrenser

CV, bilder, lagrede stillinger og brev ligger lokalt. URL-import sender bare lenken til backend, mens en aktiv AI-handling sender annonsegrunnlag og en hvitelistet kandidatmodell uten navn, telefon, e-post, bosted eller bilde. Videre produksjonsarbeid bør blant annet vurdere:

- autentisering, serverstyrt rate limiting og kostnadstak før stor offentlig AI-bruk;
- logging uten CV- eller annonseinnhold og dokumentert leverandør-/lagringstid;
- juridisk kvalitetssikring av behandlingsgrunnlag, leverandørliste og rettighetsflyt;
- Skylagring krever behandlingsgrunnlag, databehandleravtaler, sletting/innsyn, dokumentert lagringstid, kryptering og oppdatert personvernerklæring.
- En ekte annonseleverandør må ikke lastes før gyldig samtykke der samtykke kreves. Oppdater leverandørliste og formål før lansering.
- Vilkår og personvern i grensesnittet er produktutkast. Fyll inn foretaksnavn, organisasjonsnummer, adresse og kontaktpunkt, og få en juridisk kvalitetssjekk før kommersiell lansering.

Kildegrunnlaget for CV-rådene er lenket direkte i grensesnittet og datert. Rådene er veiledning, ikke en garanti for ansettelse.

## Eksisterende LaTeX-generator

This project generates the finished two-page CV from structured JSON while preserving the approved A4 geometry, colors, two-column format, photo, hyperlinks, typography and 1.15 line spacing.

### LaTeX quick start

Requirements:

- Python 3.10+
- XeLaTeX
- Python packages from `requirements.txt` (Jinja2, pypdf and Pillow)
- Poppler tools (`pdfinfo` and `pdftoppm`)
- Calibri installed locally, or Carlito as the metric-compatible fallback

Build:

```bash
python3 -m pip install -r requirements.txt
python3 generate_cv.py
```

or:

```bash
make build
```

Finished file:

```text
output/Thomas_Tolo_Jensen_CV_LaTeX.pdf
```

### Update the LaTeX CV

For normal edits, change only `cv_data.json`, then rebuild. The PDF contains clickable links to:

- `tolojensentech.no`
- `github.com/ThomasTolo`
- `thomastj278@gmail.com`

The project section explicitly directs employers to the website for screenshots and detailed app information.

### Visual validation

The approved PDF is stored in `baseline/`. To render and compare the generated output with the baseline:

```bash
make validate
```

Diff images and a JSON report are written under `validation/`.

### LaTeX design changes

Edit `templates/cv_template.tex.j2` only when intentionally changing the baseline design. The exact dimensions, colors, font setup and reusable layout macros are centralized there.

Read `IMPLEMENTATION_PLAN.md` for the complete architecture, measurements, build pipeline, validation procedure, maintenance rules and extension roadmap.
