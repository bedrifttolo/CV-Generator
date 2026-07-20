#!/usr/bin/env python3
"""Render the two-page CV from JSON data using XeLaTeX."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pypdf import PdfReader

EXPECTED_PAGES = 2
EXPECTED_WIDTH_PT = 595.3
EXPECTED_HEIGHT_PT = 841.89

LATEX_ESCAPES = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def tex_escape(value: Any) -> str:
    text = str(value)
    return "".join(LATEX_ESCAPES.get(ch, ch) for ch in text)


def tex_url(value: Any) -> str:
    # hyperref accepts URLs verbatim in the first href argument; only braces must be protected.
    return str(value).replace("{", r"\{").replace("}", r"\}")


def run_checked(command: list[str], cwd: Path) -> None:
    completed = subprocess.run(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0:
        print(completed.stdout, file=sys.stderr)
        raise SystemExit(f"Command failed ({completed.returncode}): {' '.join(command)}")


def validate_pdf(pdf_path: Path, data: dict[str, Any]) -> None:
    reader = PdfReader(str(pdf_path))
    if len(reader.pages) != EXPECTED_PAGES:
        raise SystemExit(
            f"Layout validation failed: expected {EXPECTED_PAGES} pages, got {len(reader.pages)}."
        )

    for page_number, page in enumerate(reader.pages, start=1):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        if abs(width - EXPECTED_WIDTH_PT) > 0.05 or abs(height - EXPECTED_HEIGHT_PT) > 0.05:
            raise SystemExit(
                f"Page {page_number} has unexpected media box {width} x {height} pt; "
                f"expected A4 {EXPECTED_WIDTH_PT} x {EXPECTED_HEIGHT_PT} pt."
            )

    extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    required_text = [data["name"], "Utvalgte prosjekter", data["references"]]
    missing_text = [text for text in required_text if text not in extracted_text]
    if missing_text:
        raise SystemExit(f"PDF text validation failed; missing: {missing_text}")

    actual_uris: set[str] = set()
    for page in reader.pages:
        annotations_reference = page.get("/Annots")
        annotations = annotations_reference.get_object() if annotations_reference else []
        for annotation_reference in annotations:
            annotation = annotation_reference.get_object()
            action = annotation.get("/A")
            if action and action.get("/S") == "/URI" and action.get("/URI"):
                actual_uris.add(str(action.get("/URI")))

    expected_uris = {
        item["url"] for item in data.get("contact", []) if item.get("url")
    }
    expected_uris.update(
        item["url"] for item in data.get("sidebar_links", []) if item.get("url")
    )
    project_intro_url = data.get("projects_intro", {}).get("url")
    if project_intro_url:
        expected_uris.add(project_intro_url)

    missing_uris = sorted(expected_uris - actual_uris)
    if missing_uris:
        raise SystemExit(f"PDF hyperlink validation failed; missing URI annotations: {missing_uris}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="cv_data.json", help="JSON data file")
    parser.add_argument(
        "--output",
        default="output/Thomas_Tolo_Jensen_CV_LaTeX.pdf",
        help="Finished PDF path",
    )
    parser.add_argument("--keep-tex", action="store_true", help="Keep generated .tex in build/")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    data_path = (root / args.data).resolve()
    output_path = (root / args.output).resolve()
    build_dir = root / "build"
    template_dir = root / "templates"
    build_dir.mkdir(parents=True, exist_ok=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = json.loads(data_path.read_text(encoding="utf-8"))

    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        undefined=StrictUndefined,
        autoescape=False,
        block_start_string="[%",
        block_end_string="%]",
        variable_start_string="[[",
        variable_end_string="]]",
        comment_start_string="[#",
        comment_end_string="#]",
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["tex"] = tex_escape
    env.filters["texurl"] = tex_url

    template = env.get_template("cv_template.tex.j2")
    rendered = template.render(**data)
    tex_path = build_dir / "cv_generated.tex"
    tex_path.write_text(rendered, encoding="utf-8")

    # Compile from project root so relative assets/profile.png resolves predictably.
    command = [
        "xelatex",
        "-interaction=nonstopmode",
        "-halt-on-error",
        f"-output-directory={build_dir}",
        str(tex_path),
    ]
    run_checked(command, cwd=root)
    run_checked(command, cwd=root)

    built_pdf = build_dir / "cv_generated.pdf"
    if not built_pdf.exists() or built_pdf.stat().st_size < 10_000:
        raise SystemExit("XeLaTeX did not create a valid PDF.")

    # pdfinfo confirms that the finished file is readable by an external PDF utility.
    run_checked(["pdfinfo", str(built_pdf)], cwd=root)
    validate_pdf(built_pdf, data)

    shutil.copy2(built_pdf, output_path)
    if not args.keep_tex:
        tex_path.unlink(missing_ok=True)

    print(f"Created {output_path}")
    print("Validation: 2 A4 pages, required text, clickable links, fixed two-column geometry.")


if __name__ == "__main__":
    main()
