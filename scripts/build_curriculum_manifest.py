#!/usr/bin/env python3
"""Build a storage-friendly curriculum catalog from the processed Yemen books.

The script intentionally does not copy PDFs into the web bundle. It creates:
  data/curriculum_manifest.json  - local source inventory and checksums
  data/curriculum_books_seed.json - Firestore-ready metadata with no large text

Upload the PDF and page JSON files to Firebase Storage separately, then replace
pdfUrl/manifestUrl (or storage paths) in the seed before importing it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

GRADE_MAP = {
    'الصف_السابع_الأساسي': ('grade_7', 'الصف السابع الأساسي'),
    'الصف_الثامن_الأساسي': ('grade_8', 'الصف الثامن الأساسي'),
    'الصف_التاسع_الأساسي': ('grade_9', 'الصف التاسع الأساسي'),
    'الصف_الأول_الثانوي': ('secondary_1', 'الصف الأول الثانوي'),
    'الصف_الثاني_الثانوي': ('secondary_2_scientific', 'الصف الثاني الثانوي (العلمي)'),
    'الصف_الثالث_الثانوي': ('secondary_3_scientific', 'الصف الثالث الثانوي (العلمي)'),
}

PART_LABELS = {
    'part_1': 'الجزء الأول',
    'part_2': 'الجزء الثاني',
    'combined': 'الجزء الأول والثاني',
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def safe_id(value: str) -> str:
    value = re.sub(r'[^\w\u0600-\u06ff]+', '-', value, flags=re.UNICODE).strip('-_').lower()
    return value or 'book'


def infer_part(directory_name: str, pdf_name: str) -> str:
    text = f'{directory_name} {pdf_name}'
    if 'ج1+ج2' in text or 'الأول_والثاني' in text or 'كورس' in text:
        return 'combined'
    if 'ج1' in text or 'الأول' in text:
        return 'part_1'
    if 'ج2' in text or 'الثاني' in text:
        return 'part_2'
    return 'combined'


def page_count(json_path: Path) -> int:
    try:
        payload = json.loads(json_path.read_text(encoding='utf-8'))
        rows = payload if isinstance(payload, list) else payload.get('pages', payload.get('data', []))
        return len(rows) if isinstance(rows, list) else 0
    except (OSError, ValueError, TypeError):
        return 0


def generic_units(total_pages: int) -> list[dict[str, Any]]:
    """Provide a navigable fallback until a teacher/admin adds official unit mapping."""
    if total_pages <= 0:
        return []
    chunk = 12
    lessons = []
    for start in range(1, total_pages + 1, chunk):
        end = min(total_pages, start + chunk - 1)
        lessons.append({
            'id': f'lesson-pages-{start}-{end}',
            'title': f'صفحات {start} - {end}',
            'lessonNumber': len(lessons) + 1,
            'startPage': start,
            'endPage': end,
        })
    return [{
        'id': 'unit-book-pages',
        'title': 'فهرس الصفحات',
        'unitNumber': 1,
        'startPage': 1,
        'endPage': total_pages,
        'lessons': lessons,
    }]


def build(root: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    inventory: list[dict[str, Any]] = []
    seed: list[dict[str, Any]] = []
    for grade_dir in sorted(root.iterdir()):
        if not grade_dir.is_dir() or grade_dir.name not in GRADE_MAP:
            continue
        grade_key, grade_label = GRADE_MAP[grade_dir.name]
        for subject_dir in sorted(grade_dir.iterdir()):
            if not subject_dir.is_dir():
                continue
            pdfs = sorted(subject_dir.glob('*.pdf'))
            jsons = sorted(subject_dir.glob('*.json'))
            txts = sorted(subject_dir.glob('*.txt'))
            if not pdfs:
                continue
            pdf = pdfs[0]
            json_file = jsons[0] if jsons else None
            txt_file = txts[0] if txts else None
            part = infer_part(subject_dir.name, pdf.name)
            subject = re.sub(r'_ج[12]|_ج1\+ج2|_كورس|_وعلومه', '', subject_dir.name).replace('_', ' ').strip()
            book_id = safe_id(f'{grade_key}-{subject}-{part}')
            pages = page_count(json_file) if json_file else 0
            relative = lambda path: str(path.relative_to(root)) if path else None
            record = {
                'id': book_id,
                'gradeKey': grade_key,
                'grade': grade_label,
                'subject': subject,
                'part': part,
                'partLabel': PART_LABELS[part],
                'title': f'{subject} — {PART_LABELS[part]}',
                'totalPageCount': pages,
                'localPdfPath': relative(pdf),
                'localManifestPath': relative(json_file),
                'localTextPath': relative(txt_file),
                'pdfBytes': pdf.stat().st_size,
                'pdfSha256': sha256(pdf),
                'manifestBytes': json_file.stat().st_size if json_file else 0,
                'manifestPageCount': pages,
            }
            inventory.append(record)
            seed.append({
                'id': book_id,
                'title': record['title'],
                'grade': grade_label,
                'gradeKey': grade_key,
                'subject': subject,
                'part': part,
                'totalPageCount': pages,
                'source': 'official',
                'publisher': 'الإدارة العامة للمناهج - الجمهورية اليمنية',
                'isOfficial': True,
                'isActive': True,
                'contentVersion': 'source-file-checksum',
                'localPdfPath': record['localPdfPath'],
                'localManifestPath': record['localManifestPath'],
                'localTextPath': record['localTextPath'],
                'units': generic_units(pages),
                'pdfSha256': record['pdfSha256'],
                'notes': 'استبدل local* بروابط Storage أو املأ pdfUrl وmanifestUrl قبل الاستيراد.',
            })
    return inventory, seed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True, help='Processed curriculum directory')
    parser.add_argument('--output', type=Path, default=Path('data'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    inventory, seed = build(args.root)
    (args.output / 'curriculum_manifest.json').write_text(
        json.dumps({'version': 1, 'sourceRoot': str(args.root), 'books': inventory}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    (args.output / 'curriculum_books_seed.json').write_text(
        json.dumps({'version': 1, 'books': seed}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    print(f'Generated {len(seed)} book records from {args.root}')
    for grade_key in sorted({item['gradeKey'] for item in seed}):
        print(grade_key, sum(item['gradeKey'] == grade_key for item in seed))


if __name__ == '__main__':
    main()
