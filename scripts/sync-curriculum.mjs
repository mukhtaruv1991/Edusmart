import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

// Note: This script requires a service account key file (serviceAccountKey.json)
// and the curriculum_manifest.json to be present.

async function sync() {
  const manifestPath = path.join(process.cwd(), 'data', 'curriculum_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Error: curriculum_manifest.json not found in data folder.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sourceRoot = manifest.sourceRoot || '/home/ubuntu/yemen_curriculum_processed';

  console.log(`Starting sync for ${manifest.books.length} books...`);

  // Initialize Firebase Admin (Assuming service account is provided or env vars set)
  // For the user, they should place their serviceAccountKey.json in the root.
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('--- DRY RUN MODE ---');
    console.log('Please provide serviceAccountKey.json to perform actual upload.');
    manifest.books.slice(0, 3).forEach(book => {
      console.log(`[Dry Run] Would upload: ${book.title} (${book.grade})`);
    });
    return;
  }

  const app = initializeApp({
    credential: cert(serviceAccountPath)
  });

  let db;
  try {
    // Explicitly use the default database ID found in the project
    db = getFirestore(app, 'default');
    console.log('Using Firestore database: default');
  } catch (e) {
    console.error('Firestore initialization failed:', e.message);
    console.log('--- FALLBACK: Generating SQL/JSON for manual import ---');
  }

  for (const book of manifest.books) {
    try {
      console.log(`Processing: ${book.title}...`);
      const pdfUrl = book.sourceUrl;

      if (db) {
        await db.collection('curriculumBooks').doc(book.id).set({
          ...book,
          pdfUrl: pdfUrl,
          isOfficial: true,
          isActive: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`Synced to Firestore: ${book.title}`);
      } else {
        console.log(`[Manual Import Data] ID: ${book.id}, Title: ${book.title}, URL: ${pdfUrl}`);
      }
    } catch (error) {
      console.error(`Failed to process ${book.title}:`, error.message);
    }
  }

  console.log('Sync completed.');
}

sync();
