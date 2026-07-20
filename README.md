# CVklar — norsk CV- og søknadsbygger

CVklar er en lett, lokal-først React-app der brukeren kan importere en eksisterende CV, kontrollere det viktigste innholdet, redigere direkte i dokumentet, bytte mal, få bransjetilpassede råd og laste ned CV og søknadsbrev som PDF.

Den opprinnelige LaTeX-generatoren og Thomas Tolo Jensens CV er beholdt som eksempel og som referanse for «Fjord»-malen.

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

Bygget skrives til `dist/` og kan publiseres på Vercel eller en annen statisk host. `vercel.json` inneholder CSP, clickjacking-beskyttelse, MIME-beskyttelse, referrer-policy og begrenset permissions-policy.

## Hva som virker i frontend-versjonen

- Import av PDF, DOCX og TXT, maks 10 MB. Teksten leses lokalt i nettleseren.
- Heuristisk uttrekk av navn, kontaktdata, profil, erfaring, utdanning, kompetanse og språk.
- Direkte `contentEditable`-redigering i CV-arket og automatisk lokal lagring.
- Dra-og-slipp og knapper for å endre rekkefølgen på erfaring.
- Profilbilde, lenker, fire maler og responsiv forhåndsvisning.
- Lokal, regelbasert «Ansettbar AI» med bransjeord, treff mot annonsetekst og åpne NAV-kilder.
- Søknadsbrevutkast og lokal PDF-eksport med jsPDF/html2canvas.
- Norsk guide, personvernerklæring, vilkår, samtykkebanner og tydelig merket annonseplass.

## Sikkerhet og produksjonsgrenser

Denne utgaven har ingen backend. Det er et bevisst personvernvalg: CV, bilde og annonsetekst sendes ikke til en server. Det betyr også:

- Klientbasert rate limiting kan bare redusere tilfeldige dobbeltklikk; det beskytter ikke en ekstern API.
- En ekte generativ AI må kobles via en server/edge function. API-nøkler skal aldri ligge i React-koden.
- Serveren må da ha autentisering ved behov, serverstyrt rate limiting per IP/bruker, inngangsvalidering, logging uten CV-innhold, tidsavbrudd, kostnadstak og misbruksvern.
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
