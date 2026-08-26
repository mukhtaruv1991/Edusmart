#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path

def units(total: int):
    lessons=[]
    for start in range(1, total+1, 12):
        end=min(total, start+11)
        lessons.append({'id':f'lesson-pages-{start}-{end}','title':f'صفحات {start} - {end}','lessonNumber':len(lessons)+1,'startPage':start,'endPage':end})
    return [{'id':'unit-book-pages','title':'فهرس الصفحات','unitNumber':1,'startPage':1,'endPage':total,'lessons':lessons}]

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--catalog',type=Path,default=Path('curriculum-source/processed/catalog.json')); ap.add_argument('--output',type=Path,default=Path('data/official_curriculum_firestore_seed.json')); args=ap.parse_args()
    catalog=json.loads(args.catalog.read_text(encoding='utf-8'))
    books=[]
    for m in catalog.get('books',[]):
        total=int(m.get('pageCount') or 0)
        book={
            'id':m['id'],'title':m['title'],'grade':m['grade'],'gradeKey':m['gradeKey'],'subject':m['subject'],
            'part':m.get('part','combined'),'totalPageCount':total,'source':'official','publisher':m['publisher'],
            'isOfficial':True,'isActive':True,'approvalStatus':'approved','contentVersion':m['pdfSha256'],
            'sourceUrl':m.get('sourceUrl',''),'pdfSha256':m['pdfSha256'],'pdfBytes':m['pdfBytes'],
            'localPdfPath':m['pdfPath'],'localManifestPath':m['pagesPath'],'localTextPath':m['textPath'],
            'storagePath':f"curriculum/{m['gradeKey']}/{m['id']}/book.pdf",
            'manifestStoragePath':f"curriculum/{m['gradeKey']}/{m['id']}/pages.json",
            'units':units(total),
            'notes':'مصدر رسمي؛ ارفع book.pdf وpages.json إلى مسارات Storage المذكورة ثم احفظ pdfUrl وmanifestUrl.'
        }
        books.append(book)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps({'version':1,'source':'official-yemen-curriculum','books':books},ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Generated {len(books)} Firestore-ready book records at {args.output}')

if __name__=='__main__': main()
