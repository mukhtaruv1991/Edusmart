import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const catalogPath = path.resolve(process.env.CURRICULUM_CATALOG || path.join(projectRoot, 'curriculum-source/processed/catalog.json'));
const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT || path.join(projectRoot, 'serviceAccountKey.json'));
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'mukhtaruv.firebasestorage.app';

function requiredFile(relativePath) {
  const file = path.resolve(projectRoot, relativePath);
  if (!fs.existsSync(file)) throw new Error(`الملف غير موجود: ${file}`);
  return file;
}

async function sync() {
  if (!fs.existsSync(catalogPath)) throw new Error(`catalog غير موجود: ${catalogPath}`);
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const books = catalog.books || [];
  console.log(`Starting sync for ${books.length} processed books using Firestore database: default`);
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('DRY RUN: serviceAccountKey.json غير موجود؛ لم يتم رفع أي ملف.');
    for (const book of books.slice(0, 5)) console.log(`[Dry Run] ${book.title} -> ${book.pdfPath}, ${book.pagesPath}`);
    return;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || 'mukhtaruv',
    storageBucket: bucketName,
  });
  const db = getFirestore(app, 'default');
  const bucket = getStorage(app).bucket(bucketName);

  for (const book of books) {
    try {
      const pdfPath = requiredFile(book.pdfPath);
      const pagesPath = requiredFile(book.pagesPath);
      const root = `curriculum/${book.gradeKey}/${book.id}`;
      const pdfObject = bucket.file(`${root}/book.pdf`);
      const pagesObject = bucket.file(`${root}/pages.json`);
      await bucket.upload(pdfPath, { destination: pdfObject.name, metadata: { contentType: 'application/pdf', metadata: { sha256: book.pdfSha256 } }, resumable: true });
      await bucket.upload(pagesPath, { destination: pagesObject.name, metadata: { contentType: 'application/json' }, resumable: false });
      const expires = new Date('2500-01-01T00:00:00Z');
      const [[pdfUrl], [manifestUrl]] = await Promise.all([
        pdfObject.getSignedUrl({ action: 'read', expires }),
        pagesObject.getSignedUrl({ action: 'read', expires }),
      ]);
      await db.collection('curriculumBooks').doc(book.id).set({
        ...book,
        pdfUrl,
        manifestUrl,
        textIndexUrl: manifestUrl,
        storagePath: pdfObject.name,
        manifestStoragePath: pagesObject.name,
        source: 'official',
        isOfficial: true,
        isActive: true,
        approvalStatus: 'approved',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`OK\t${book.id}`);
    } catch (error) {
      console.error(`FAIL\t${book.id}\t${error?.message || error}`);
    }
  }
  console.log('Sync completed.');
}

sync().catch((error) => { console.error(error.message); process.exitCode = 1; });
