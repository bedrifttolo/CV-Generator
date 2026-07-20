# LaTeX CV generator — detailed implementation plan

## 1. Objective and acceptance criteria

The generator treats the approved two-page CV as a fixed visual contract. Its job is to let the content be edited in structured JSON while repeatedly producing the same A4 composition, colors, typography, spacing, profile image, hyperlinks and page count.

A build is accepted only when all of the following are true:

1. XeLaTeX completes without an error.
2. A non-empty PDF is produced.
3. The PDF contains exactly two pages.
4. Both pages use the fixed A4 media box, `595.304 × 841.89 bp`.
5. The sidebar, main panel and highlight strip use the calibrated RGB/HEX colors.
6. The visible website, GitHub and email text is clickable.
7. The profile photo is present at the calibrated size.
8. No text is clipped, overlapped or moved onto a third page.
9. The global line-spacing setting is `1.15`.
10. Calibri is used when it is installed; otherwise the build uses Carlito, the metric-compatible fallback used to reproduce the baseline in environments where Calibri is unavailable.

The reference PDF is included in `baseline/` so future changes can be visually compared against the approved version.

## 2. Exact visual specification

### 2.1 Page and column geometry

All measurements use PDF big points (`bp`), where 72 bp equals one inch. Using `bp` avoids the small conversion drift that occurs when normal TeX points are mixed with PDF measurements.

| Element | Measurement |
|---|---:|
| Page size | `595.304 × 841.89 bp` |
| Outer white offset | `12.95 bp` |
| Colored panel height | `810 bp` |
| Sidebar x-position | `12.95 bp` |
| Sidebar width | `180 bp` |
| Main panel x-position | `192.95 bp` |
| Main panel width | `389.5 bp` |
| Sidebar inner width | `168 bp` |
| Sidebar left/right padding | `6 bp` |
| Main inner width | `374.5 bp` |
| Main left/right padding | `7.5 bp` |
| Profile image | `138.24 × 138.24 bp` |

The colored panels are drawn with TikZ in `\AddToShipoutPictureBG`. They are therefore independent of normal paragraph flow and cannot resize when content changes.

### 2.2 Color palette

| Token | HEX | Purpose |
|---|---|---|
| `Sidebar` | `#192738` | Dark navy left column |
| `MainBg` | `#EEF3F6` | Main page background |
| `HighlightBg` | `#DCE7EB` | Three-part value strip |
| `MainText` | `#18222D` | Primary text |
| `MutedText` | `#465460` | Dates, supporting text and references |
| `Accent` | `#27677A` | Headline, highlight labels and main links |
| `MainRule` | `#A7BBC4` | Main-column section rules |
| `SideRule` | `#D4E0E5` | Sidebar section rules |
| `SideLink` | `#5CB7CA` | Sidebar hyperlinks |

The color definitions are centralized at the start of `templates/cv_template.tex.j2`. No section should contain an ad-hoc replacement color.

### 2.3 Typography and spacing

The document is compiled with XeLaTeX and `fontspec`:

```tex
\IfFontExistsTF{Calibri}{
  \setmainfont{Calibri}[Ligatures=TeX]
}{
  \setmainfont{Carlito}[Ligatures=TeX]
}
```

No proprietary font file is bundled. On a computer with Calibri installed, XeLaTeX uses Calibri. In a clean Linux environment, Carlito preserves almost the same character metrics and line wrapping.

The global rule is:

```tex
\setstretch{1.15}
```

Fixed-size headings and dense sidebar rows also use explicit font-size/baseline pairs. This is deliberate: the global 1.15 rule remains active, while calibrated regions preserve the exact two-page baseline.

| Text role | Size |
|---|---:|
| Name | `25 bp` |
| Page-two title | `20 bp` |
| Main section heading | `15 bp` |
| Sidebar heading | `11 bp` |
| Experience/project title | `10.5 bp` |
| Education title | `10 bp` |
| Headline and profile paragraph | `9 bp` |
| Body, dates, links and bullets | `8.5 bp` |
| Highlight strip | `7.5 bp` |

Other text behavior:

- Paragraph indentation is disabled.
- Paragraph spacing is explicitly controlled.
- Automatic hyphenation is strongly discouraged to preserve line breaks.
- Bullet hanging indents are fixed.
- Section gaps are represented by named macros and calibrated `bp` values.
- The footer/reference line has a fixed offset rather than flexible vertical fill.

## 3. Project structure

```text
latex_cv_generator/
├── assets/
│   └── profile.png
├── baseline/
│   └── Thomas_Tolo_Jensen_CV_2026_baseline.pdf
├── output/
│   └── Thomas_Tolo_Jensen_CV_LaTeX.pdf
├── templates/
│   └── cv_template.tex.j2
├── cv_data.json
├── generate_cv.py
├── validate_visual.py
├── IMPLEMENTATION_PLAN.md
├── README.md
├── Makefile
└── requirements.txt
```

### Responsibility of each file

- `cv_data.json`: the only file normally edited when changing CV content.
- `templates/cv_template.tex.j2`: the fixed visual system and LaTeX macros.
- `generate_cv.py`: data loading, LaTeX escaping, template rendering, compilation and structural validation.
- `validate_visual.py`: optional rendering and comparison against the reference PDF.
- `assets/profile.png`: the already cropped circular profile photo with white rim.
- `baseline/...pdf`: the approved reference used for visual regression.
- `output/...pdf`: the finished, validated CV.
- `Makefile`: short commands for build, validation and cleanup.

## 4. Data model

`cv_data.json` is divided by visual region rather than by low-level LaTeX commands. This keeps the content readable and prevents normal edits from affecting the layout implementation.

Top-level groups:

- `name`, `headline`, `profile`
- `contact`
- `highlights`
- `sidebar_page_1`
- `experience`
- `education`
- `results`
- `sidebar_page_2`
- `sidebar_links`
- `projects_intro`
- `projects`
- `other_projects_label`, `other_projects`
- `work_style`
- `references`

A linked value uses separate display text and destination fields:

```json
{
  "label": "Nettside",
  "text": "tolojensentech.no",
  "url": "https://www.tolojensentech.no"
}
```

This avoids long raw URLs in the layout while preserving a correct clickable target.

## 5. Template design

The Jinja2 environment uses non-standard delimiters (`[[ ... ]]` and `[% ... %]`) so ordinary LaTeX braces do not conflict with template syntax.

The template contains reusable components:

- `\SideSection`: sidebar title, divider and calibrated following gap.
- `\SideItem`: white sidebar bullet with fixed leading.
- `\ContactLine`: bold label plus text or link.
- `\MainSection`: large title and divider.
- `\RoleTitle` and `\RoleDate`: experience entries.
- `\MainBullet`: fixed hanging-indent bullet.
- `\EducationBlock`: four-line education block.
- `\ProjectTitle` and `\MetaLine`: project title, result and technology lines.
- `\HighlightBox`: one third of the three-column highlight strip.
- `\UnderlinedLink`: controlled link color and underline.

Page one and page two are explicit minipage rows. This is preferable to automatic newspaper-style columns because it guarantees the same sidebar width, main-column start and page break every time.

## 6. Generator pipeline

Running `python3 generate_cv.py` performs the following sequence:

1. Resolve paths relative to the project directory.
2. Read `cv_data.json` as UTF-8.
3. Parse the JSON and fail on invalid syntax.
4. Initialize Jinja2 with `StrictUndefined`; a misspelled or missing field therefore stops the build instead of silently disappearing.
5. Escape LaTeX-sensitive characters in normal text.
6. Preserve valid URL syntax in hyperlink destinations.
7. Render `templates/cv_template.tex.j2` to `build/cv_generated.tex`.
8. Execute XeLaTeX twice so PDF metadata and links are finalized.
9. Confirm that `build/cv_generated.pdf` exists and is larger than the minimum validity threshold.
10. Run `pdfinfo` to confirm the file is readable by an external PDF utility.
11. Use pypdf to validate the two-page A4 media boxes, required extracted text and URI annotations.
12. Fail unless every structural validation passes.
13. Copy the validated file to `output/Thomas_Tolo_Jensen_CV_LaTeX.pdf`.
14. Remove the temporary `.tex` file unless `--keep-tex` is supplied.

Useful commands:

```bash
python3 generate_cv.py
python3 generate_cv.py --keep-tex
python3 generate_cv.py --data cv_data.json --output output/custom_name.pdf
```

## 7. Content-editing workflow

For a normal CV update:

1. Open `cv_data.json`.
2. Change only the relevant text, list item or link.
3. Keep title lengths close to the current versions.
4. Prefer one- or two-line bullets.
5. Run `make build`.
6. Open both pages of the PDF at 100% zoom.
7. Run `make validate` after larger changes.
8. Commit the JSON, template and final PDF together.

Recommended content limits for the present design:

- Experience: four roles.
- Project page: five detailed projects plus one short “other projects” line.
- Experience bullets: two or three per role.
- Project bullets: two or three per project.
- Sidebar item: preferably one line.
- Visible link text: short domain or account name, never a long tracking URL.

The generator deliberately fails when overflow creates a third page. It does not silently reduce font size, because that would break consistency and readability.

## 8. Structural and hyperlink validation

The mandatory build checks are performed by `generate_cv.py`. Additional manual or automated checks should confirm:

- PDF media box is A4.
- Page count is two.
- Email URI begins with `mailto:`.
- Website and GitHub annotations contain HTTPS targets.
- Text extraction includes both page titles and the final reference line.
- Profile image is embedded.
- No JavaScript, form field or unexpected encryption is present.

The delivered PDF was checked as a two-page A4 document and contains six URI annotations: three on page one and three on page two.

## 9. Visual-regression validation

Run:

```bash
make validate
```

`validate_visual.py` does the following:

1. Builds the current CV.
2. Reads page count and page size from both PDFs.
3. Renders the baseline and generated PDFs at the same DPI with `pdftoppm`.
4. Checks that image dimensions are identical.
5. Calculates changed-pixel and mean-difference metrics.
6. Saves visual diff images under `validation/diff/`.
7. Fails if the broad visual difference exceeds the configured threshold.

The comparison is intentionally a regression alarm, not a promise that two different PDF text engines will rasterize every glyph into identical pixels. Geometry, colors, line wrapping and section anchors are the source of truth. During calibration, the major text anchors on both pages were aligned to approximately `0.05 bp` or better against the reference PDF.

Manual inspection should still cover:

- column boundaries and white outer edge;
- profile-photo size and position;
- headline and profile wrapping;
- highlight-strip height and three equal regions;
- every section rule;
- bullet hanging indents;
- education and results positions;
- project wrapping and technology lines;
- page-two final reference position;
- link appearance and click targets.

## 10. Environment setup

Required software:

- Python 3.10 or newer
- Jinja2
- pypdf, for media-box, text and URI-annotation validation
- Pillow, for optional visual comparison
- XeLaTeX with `fontspec`, TikZ, `eso-pic`, `hyperref`, `setspace` and standard LaTeX packages
- Poppler tools: `pdfinfo` and `pdftoppm`
- Calibri installed on the build machine, or Carlito as fallback

Typical Debian/Ubuntu setup:

```bash
sudo apt-get update
sudo apt-get install -y \
  texlive-xetex texlive-latex-extra texlive-fonts-recommended \
  fonts-crosextra-carlito poppler-utils python3 python3-venv
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
make build
```

On Windows or macOS, install a TeX distribution that provides XeLaTeX, ensure `xelatex` and `pdfinfo` are on `PATH`, then install the Python requirements.

## 11. Reproducibility and font policy

A PDF can only be pixel-identical across machines when the same fonts, font versions, XeTeX version and PDF renderer are used. The project therefore separates two goals:

- **Design identity:** fixed dimensions, colors, text hierarchy, wrapping targets, section anchors and content structure.
- **Raster identity:** optional and dependent on the exact font/rendering environment.

For the closest result on a Windows machine, install/build with Calibri. For a distributable Linux build, Carlito is the intended fallback. Font files are not included in the project.

## 12. Maintenance rules

Do not change these without a fresh visual calibration:

- page dimensions;
- panel width or x-position;
- main/sidebar padding;
- font family or font sizes;
- global 1.15 spacing;
- profile-image dimensions;
- section macro gaps;
- bullet indentation;
- project count or substantially longer project titles.

When a design change is intentional:

1. Duplicate the current reference PDF.
2. Change one group of constants at a time.
3. Build and render both pages.
4. Compare against the old reference.
5. Inspect at 100% and 200% zoom.
6. Approve the new PDF.
7. Replace the file in `baseline/` only after approval.

## 13. Extension roadmap

The current architecture can be extended without replacing the PDF template:

- JSON Schema validation and text-length warnings.
- Norwegian and English content files using the same visual template.
- One-page and two-page template variants.
- A browser form that writes the same JSON model.
- A local desktop interface for photo and content selection.
- GitHub Actions that builds and stores the PDF on every content change.
- A Docker image pinning TeX Live, Python and Carlito versions.
- Automated tests for URI annotations, text extraction and known color areas.
- Optional ATS-oriented single-column output generated from the same JSON.

The fixed two-page PDF remains the visual source of truth. New interfaces should modify data, not duplicate layout logic.
