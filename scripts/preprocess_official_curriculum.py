#!/usr/bin/env python3
"""Convert downloaded official Yemen curriculum PDFs into page JSON manifests.

The PDF binaries stay outside the web bundle. Each book receives pages.json,
full.txt, and metadata.json under curriculum-source/processed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

GRADE_META = {
    "7": ("grade_7", "الصف السابع الأساسي"),
    "8": ("grade_8", "الصف الثامن الأساسي"),
    "9": ("grade_9", "الصف التاسع الأساسي"),
    "10": ("secondary_1", "الصف الأول الثانوي"),
    "11": ("secondary_2_scientific", "الصف الثاني الثانوي (العلمي)"),
    "12": ("secondary_3_scientific", "الصف الثالث الثانوي (العلمي)"),
}
SUBJECTS = {
    "arabic": "اللغة العربية", "english": "اللغة الإنجليزية", "mathematics": "الرياضيات",
    "mathematic": "الرياضيات", "science": "العلوم", "biology": "الأحياء",
    "chemistry": "الكيمياء", "physical": "الفيزياء", "history": "التاريخ",
    "geographic": "الجغرافيا", "quran": "القرآن الكريم", "holy_quran": "القرآن الكريم",
    "islamic": "التربية الإسلامية", "fikh": "الفقه", "al_eiman": "الإيمان",
    "al_hadith": "الحديث والفقه", "al_sira": "السيرة", "computer": "الحاسوب",
    "economic": "الاقتصاد", "sociology": "علم الاجتماع", "psychology": "علم النفس",
    "phylasophy": "الفلسفة", "logic_science": "المنطق", "national": "التربية الوطنية",
    "physical_actions": "التطبيقات العملية للفيزياء", "biology_actions": "التطبيقات العملية للأحياء",
    "chemistry_actions": "التطبيقات العملية للكيمياء", "english_pubils": "اللغة الإنجليزية",
    "english_work": "كتاب التمارين الإنجليزية", "reading": "القراءة", "nahw": "النحو",
    "nosos": "النصوص", "exercise_mathe": "تمارين الرياضيات", "exercise_mathematic": "تمارين الرياضيات",
    "science_the_map": "الأطلس العلمي",
}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-").lower()

def title_for(stem: str) -> str:
    base = re.sub(r"_(?:part|ج)[12]", "", stem)
    base = re.sub(r"_(?:7|8|9|10|11|12)th$", "", base)
    token = base.split("_")[0]
    subject = next((label for key, label in SUBJECTS.items() if base.startswith(key)), base.replace("_", " "))
    part = "الجزء الأول" if "part1" in stem or "_part_1" in stem else ("الجزء الثاني" if "part2" in stem or "_part_2" in stem else "الكتاب")
    return f"{subject} — {part}"

def extract_page_text(pdf: Path, number: int, allow_ocr: bool) -> tuple[str, str]:
    result = subprocess.run(["pdftotext", "-f", str(number), "-l", str(number), "-layout", "-enc", "UTF-8", str(pdf), "-"], capture_output=True, text=True, errors="replace")
    text = re.sub(r"\r\n?", "\n", result.stdout).strip()
    if text or not allow_ocr:
        return text, "pdftotext" if text else "none"
    with tempfile.TemporaryDirectory(prefix="edusmart-ocr-") as temp_dir:
        image_prefix = str(Path(temp_dir) / "page")
        rendered = subprocess.run(["pdftoppm", "-f", str(number), "-l", str(number), "-r", "180", "-gray", "-singlefile", "-png", str(pdf), image_prefix], capture_output=True)
        if rendered.returncode != 0:
            return "", "none"
        ocr = subprocess.run(["tesseract", f"{image_prefix}.png", "stdout", "-l", "ara+eng", "--psm", "6"], capture_output=True, text=True, errors="replace")
        return re.sub(r"\r\n?", "\n", ocr.stdout).strip(), "tesseract-ara" if ocr.returncode == 0 else "none"

def extract_pages(pdf: Path, allow_ocr: bool) -> list[dict[str, Any]]:
    info = subprocess.run(["pdfinfo", str(pdf)], check=True, capture_output=True, text=True)
    match = re.search(r"^Pages:\s+(\d+)", info.stdout, re.MULTILINE)
    if not match:
        raise RuntimeError(f"تعذر معرفة عدد صفحات {pdf}")
    count = int(match.group(1))
    pages: list[dict[str, Any]] = []
    for number in range(1, count + 1):
        text, extraction = extract_page_text(pdf, number, allow_ocr)
        pages.append({"pageNumber": number, "text": text, "hasText": bool(text), "characterCount": len(text), "extraction": extraction})
    return pages

def process(pdf: Path, grade: str, url: str, output_root: Path, force: bool = False, allow_ocr: bool = False) -> dict[str, Any]:
    out = output_root / f"grade{grade}" / slug(pdf.stem)
    out.mkdir(parents=True, exist_ok=True)
    pages_path = out / "pages.json"
    text_path = out / "full.txt"
    metadata_path = out / "metadata.json"
    if pages_path.exists() and metadata_path.exists() and not force:
        return json.loads(metadata_path.read_text(encoding="utf-8"))
    pages = extract_pages(pdf, allow_ocr)
    payload = {"version": 1, "pageCount": len(pages), "pages": pages}
    pages_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    text_path.write_text("\n\n".join(f"[صفحة {p['pageNumber']}]\n{p['text']}" for p in pages), encoding="utf-8")
    grade_key, grade_label = GRADE_META[grade]
    metadata = {
        "version": 1, "id": f"{grade_key}-{slug(pdf.stem)}", "grade": grade_label, "gradeKey": grade_key,
        "title": title_for(pdf.stem), "subject": title_for(pdf.stem).split(" — ")[0],
        "part": "part_1" if "part1" in pdf.stem else ("part_2" if "part2" in pdf.stem else "combined"),
        "publisher": "الإدارة العامة للمناهج - وزارة التربية والتعليم والبحث العلمي - الجمهورية اليمنية",
        "source": "official", "isOfficial": True, "isActive": True, "sourceUrl": url,
        "pdfPath": str(pdf.resolve().relative_to(Path("/home/ubuntu/Edusmart").resolve())),
        "pagesPath": str(pages_path.resolve().relative_to(Path("/home/ubuntu/Edusmart").resolve())),
        "textPath": str(text_path.resolve().relative_to(Path("/home/ubuntu/Edusmart").resolve())),
        "pdfBytes": pdf.stat().st_size, "pdfSha256": sha256(pdf), "pageCount": len(pages),
        "textPageCount": sum(1 for p in pages if p["hasText"]),
        "textCharacterCount": sum(p["characterCount"] for p in pages),
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("curriculum-source/originals"))
    parser.add_argument("--output", type=Path, default=Path("curriculum-source/processed"))
    parser.add_argument("--map", type=Path, default=Path("curriculum-source/manifests/official-books-http.tsv"))
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--ocr", action="store_true", help="OCR pages with no embedded text using Arabic+English Tesseract")
    args = parser.parse_args()
    links = {}
    for line in args.map.read_text(encoding="utf-8").splitlines():
        grade, url, name = line.split("\t")
        links[(grade, name)] = url
    all_meta = []
    for grade_dir in sorted(args.root.glob("grade*")):
        grade = grade_dir.name.removeprefix("grade")
        if grade not in GRADE_META:
            continue
        for pdf in sorted(grade_dir.glob("*.pdf")):
            try:
                metadata = process(pdf, grade, links.get((grade, pdf.name), ""), args.output, args.force, args.ocr)
                all_meta.append(metadata)
                print(f"OK\tgrade{grade}\t{pdf.name}\t{metadata['pageCount']} pages\t{metadata['textPageCount']} text pages", flush=True)
            except Exception as exc:
                print(f"FAIL\tgrade{grade}\t{pdf.name}\t{exc}", flush=True)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "catalog.json").write_text(json.dumps({"version": 1, "books": all_meta}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Processed {len(all_meta)} books")

if __name__ == "__main__":
    main()
