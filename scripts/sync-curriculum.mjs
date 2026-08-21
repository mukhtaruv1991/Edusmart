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
    credential: cert(serviceAccountPath),
    storageBucket: `${process.env.FIREBASE_PROJECT_ID || 'edusmart-yemen'}.appspot.com`
  });

  const db = getFirestore(app);
  const bucket = getStorage(app).bucket();

  for (const book of manifest.books) {
    try {
      console.log(`Syncing: ${book.title}...`);

      const localJsonPath = path.join(sourceRoot, book.localManifestPath);
      const storagePath = `curriculum/${book.gradeKey}/${book.id}/pages.json`;

      if (fs.existsSync(localJsonPath)) {
        // Upload JSON manifest
        await bucket.upload(localJsonPath, {
          destination: storagePath,
          metadata: { contentType: 'application/json' }
        });

        const [url] = await bucket.file(storagePath).getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });

        // Create Firestore entry
        await db.collection('curriculumBooks').doc(book.id).set({
          ...book,
          manifestUrl: url,
          textIndexUrl: url,
          storagePath: `curriculum/${book.gradeKey}/${book.id}/book.pdf`, // Placeholder for PDF
          manifestStoragePath: storagePath,
          isOfficial: true,
          isActive: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`Successfully synced: ${book.title}`);
      } else {
        console.warn(`Warning: Local file not found for ${book.title} at ${localJsonPath}`);
      }
    } catch (error) {
      console.error(`Failed to sync ${book.title}:`, error.message);
    }
  }

  console.log('Sync completed.');
}

sync();
