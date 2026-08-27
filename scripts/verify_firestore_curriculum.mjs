import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';
const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const firestore = getFirestore(app, 'default');
const booksSnapshot = await firestore.collection('curriculumBooks').get();
let valid = 0;
let invalid = 0;
let totalChunks = 0;

for (const bookDoc of booksSnapshot.docs) {
  const data = bookDoc.data();
  const chunks = await bookDoc.ref.collection('contentChunks').get();
  const hasRequiredMetadata = Boolean(
    data.title && data.subject && data.gradeKey &&
    Number(data.totalPageCount) > 0 &&
    data.contentMode === 'firestore_chunks' &&
    Number(data.contentChunkCount) === chunks.size &&
    data.pdfUrl,
  );
  if (hasRequiredMetadata) valid += 1;
  else invalid += 1;
  totalChunks += chunks.size;
}

console.log(JSON.stringify({ books: booksSnapshot.size, valid, invalid, chunks: totalChunks }));
await app.delete();
