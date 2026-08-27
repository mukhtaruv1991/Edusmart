import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serviceAccount = JSON.parse(fs.readFileSync(path.join(root, 'serviceAccountKey.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'curriculum-source/processed/catalog.json'), 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, 'default');
const MAX_CHARS = 650_000;

function chunks(pages) {
  const out = [];
  let current = [];
  let size = 2;
  for (const page of pages) {
    const encoded = JSON.stringify(page);
    if (current.length && size + encoded.length + 1 > MAX_CHARS) {
      out.push(current);
      current = [];
      size = 2;
    }
    current.push(page);
    size += encoded.length + 1;
  }
  if (current.length) out.push(current);
  return out;
}

async function commitChunks(book, groups) {
  const ref = db.collection('curriculumBooks').doc(book.id);
  const old = await ref.collection('contentChunks').get();
  let batch = db.batch(); let count = 0;
  for (const doc of old.docs) { batch.delete(doc.ref); if (++count === 400) { await batch.commit(); batch=db.batch(); count=0; } }
  for (let i = 0; i < groups.length; i++) {
    const chunkRef = ref.collection('contentChunks').doc(String(i).padStart(5, '0'));
    batch.set(chunkRef, { bookId: book.id, chunkIndex: i, chunkCount: groups.length, pages: groups[i], updatedAt: FieldValue.serverTimestamp() });
    if (++count === 400) { await batch.commit(); batch=db.batch(); count=0; }
  }
  if (count) await batch.commit();
}

for (const book of catalog.books || []) {
  try {
    const pagesPath = path.resolve(root, book.pagesPath);
    const pagesPayload = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
    const groups = chunks(pagesPayload.pages || []);
    const ref = db.collection('curriculumBooks').doc(book.id);
    await ref.set({
      id: book.id, title: book.title, grade: book.grade, gradeKey: book.gradeKey, subject: book.subject,
      part: book.part, totalPageCount: book.pageCount, source: 'official', publisher: book.publisher,
      isOfficial: true, isActive: true, approvalStatus: 'approved', contentVersion: book.pdfSha256,
      pdfUrl: book.sourceUrl, sourceUrl: book.sourceUrl, contentMode: 'firestore_chunks',
      contentChunkCount: groups.length, pdfSha256: book.pdfSha256, pdfBytes: book.pdfBytes,
      updatedAt: FieldValue.serverTimestamp(), units: [{ id: 'unit-book-pages', title: 'فهرس الصفحات', unitNumber: 1, startPage: 1, endPage: book.pageCount, lessons: [] }],
    }, { merge: true });
    await commitChunks(book, groups);
    console.log(`OK\t${book.id}\tpages=${book.pageCount}\tchunks=${groups.length}`);
  } catch (error) {
    console.error(`FAIL\t${book.id}\t${error?.message || error}`);
  }
}
console.log('Firestore-only curriculum sync completed.');
