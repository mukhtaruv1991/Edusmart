#!/usr/bin/env python3
import json
from pathlib import Path

seed = json.loads(Path('data/curriculum_books_seed.json').read_text(encoding='utf-8'))['books']
manifest = json.loads(Path('data/curriculum_manifest.json').read_text(encoding='utf-8'))['books']
assert len(seed) == len(manifest), (len(seed), len(manifest))
required = {'id', 'title', 'gradeKey', 'grade', 'subject', 'part', 'totalPageCount', 'localPdfPath', 'localManifestPath', 'units'}
for book in seed:
    missing = required - set(book)
    assert not missing, (book['id'], sorted(missing))
    assert book['totalPageCount'] >= 0
    assert book['part'] in {'part_1', 'part_2', 'combined'}
    assert 'pdfUrl' not in book and 'manifestUrl' not in book
print(f'validated {len(seed)} books; no PDFs or JSON payloads embedded in seed')
for grade in sorted({book['gradeKey'] for book in seed}):
    rows = [book for book in seed if book['gradeKey'] == grade]
    print(f'{grade}: {len(rows)} books, {sum(book["totalPageCount"] for book in rows)} indexed pages')
