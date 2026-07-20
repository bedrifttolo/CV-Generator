#!/usr/bin/env python3
"""Build and visually compare the generated CV with the approved baseline PDF."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageStat

EXPECTED_PAGES = 2
EXPECTED_WIDTH_PT = 595.304
EXPECTED_HEIGHT_PT = 841.89


def run(command: list[str], cwd: Path) -> str:
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
    return completed.stdout


def pdf_metadata(path: Path, root: Path) -> dict[str, float | int]:
    output = run(["pdfinfo", str(path)], cwd=root)
    pages_match = re.search(r"^Pages:\s+(\d+)", output, flags=re.MULTILINE)
    size_match = re.search(
        r"^Page size:\s+([0-9.]+)\s+x\s+([0-9.]+)\s+pts",
        output,
        flags=re.MULTILINE,
    )
    if not pages_match or not size_match:
        raise SystemExit(f"Could not read page metadata from {path}")
    return {
        "pages": int(pages_match.group(1)),
        "width_pt": float(size_match.group(1)),
        "height_pt": float(size_match.group(2)),
    }


def render_pdf(pdf: Path, destination: Path, dpi: int, root: Path) -> list[Path]:
    destination.mkdir(parents=True, exist_ok=True)
    prefix = destination / "page"
    run(["pdftoppm", "-png", "-r", str(dpi), str(pdf), str(prefix)], cwd=root)
    rendered = sorted(destination.glob("page-*.png"))
    if len(rendered) != EXPECTED_PAGES:
        raise SystemExit(f"Expected {EXPECTED_PAGES} rendered pages for {pdf}, got {len(rendered)}")
    return rendered


def compare_images(reference: Path, generated: Path, diff_path: Path, threshold: int) -> dict[str, float | list[int]]:
    with Image.open(reference) as ref_image, Image.open(generated) as gen_image:
        ref = ref_image.convert("RGB")
        gen = gen_image.convert("RGB")
        if ref.size != gen.size:
            raise SystemExit(f"Render size mismatch: {reference}={ref.size}, {generated}={gen.size}")

        diff = ImageChops.difference(ref, gen)
        red, green, blue = diff.split()
        maximum_channel = ImageChops.lighter(ImageChops.lighter(red, green), blue)
        thresholded = maximum_channel.point(lambda value: 255 if value > threshold else 0)
        histogram = thresholded.histogram()
        total_pixels = ref.width * ref.height
        changed_pixels = total_pixels - histogram[0]
        changed_percent = changed_pixels / total_pixels * 100.0
        mean_absolute_difference = sum(ImageStat.Stat(diff).mean) / 3.0

        diff_path.parent.mkdir(parents=True, exist_ok=True)
        ImageEnhance.Brightness(diff).enhance(4.0).save(diff_path)

        return {
            "dimensions_px": [ref.width, ref.height],
            "changed_pixels": changed_pixels,
            "changed_percent": round(changed_percent, 6),
            "mean_absolute_channel_difference": round(mean_absolute_difference, 6),
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--baseline",
        default="baseline/Thomas_Tolo_Jensen_CV_2026_baseline.pdf",
        help="Approved baseline PDF, relative to the project root by default.",
    )
    parser.add_argument(
        "--generated",
        default="output/Thomas_Tolo_Jensen_CV_LaTeX.pdf",
        help="Generated PDF, relative to the project root by default.",
    )
    parser.add_argument("--dpi", type=int, default=150, help="Rendering resolution.")
    parser.add_argument(
        "--pixel-threshold",
        type=int,
        default=5,
        help="Ignore antialiasing differences at or below this channel value.",
    )
    parser.add_argument(
        "--max-changed-percent",
        type=float,
        default=20.0,
        help="Fail when a page exceeds this broad visual-difference percentage.",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Compare existing PDFs without running generate_cv.py first.",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    baseline = (root / args.baseline).resolve()
    generated = (root / args.generated).resolve()
    validation_dir = root / "validation"

    if not args.skip_build:
        run([sys.executable, "generate_cv.py"], cwd=root)

    for required in (baseline, generated):
        if not required.exists():
            raise SystemExit(f"Missing PDF: {required}")

    baseline_meta = pdf_metadata(baseline, root)
    generated_meta = pdf_metadata(generated, root)

    for label, metadata in (("baseline", baseline_meta), ("generated", generated_meta)):
        if metadata["pages"] != EXPECTED_PAGES:
            raise SystemExit(f"{label} PDF has {metadata['pages']} pages; expected {EXPECTED_PAGES}.")
        if abs(float(metadata["width_pt"]) - EXPECTED_WIDTH_PT) > 0.05:
            raise SystemExit(f"{label} PDF width is not the calibrated A4 width: {metadata['width_pt']} pt")
        if abs(float(metadata["height_pt"]) - EXPECTED_HEIGHT_PT) > 0.05:
            raise SystemExit(f"{label} PDF height is not the calibrated A4 height: {metadata['height_pt']} pt")

    if validation_dir.exists():
        shutil.rmtree(validation_dir)
    baseline_pages = render_pdf(baseline, validation_dir / "baseline", args.dpi, root)
    generated_pages = render_pdf(generated, validation_dir / "generated", args.dpi, root)

    page_results: list[dict[str, object]] = []
    failed_pages: list[int] = []
    for index, (ref_page, gen_page) in enumerate(zip(baseline_pages, generated_pages), start=1):
        metrics = compare_images(
            ref_page,
            gen_page,
            validation_dir / "diff" / f"page-{index}.png",
            args.pixel_threshold,
        )
        page_result: dict[str, object] = {"page": index, **metrics}
        page_results.append(page_result)
        if float(metrics["changed_percent"]) > args.max_changed_percent:
            failed_pages.append(index)

    report = {
        "baseline": str(baseline.relative_to(root)),
        "generated": str(generated.relative_to(root)),
        "dpi": args.dpi,
        "pixel_threshold": args.pixel_threshold,
        "max_changed_percent": args.max_changed_percent,
        "baseline_metadata": baseline_meta,
        "generated_metadata": generated_meta,
        "pages": page_results,
        "passed": not failed_pages,
        "note": (
            "The visual threshold detects broad layout drift. Different PDF/font renderers may "
            "rasterize otherwise aligned glyphs differently."
        ),
    }
    report_path = validation_dir / "report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    for result in page_results:
        print(
            f"Page {result['page']}: {result['changed_percent']:.3f}% changed pixels "
            f"(threshold > {args.pixel_threshold}); diff saved."
        )
    print(f"Report: {report_path}")

    if failed_pages:
        raise SystemExit(
            "Visual regression failed on page(s): " + ", ".join(str(page) for page in failed_pages)
        )
    print("Visual regression passed.")


if __name__ == "__main__":
    main()
