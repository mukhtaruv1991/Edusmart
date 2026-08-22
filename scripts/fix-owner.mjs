import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

const ownerEmail = process.env.OWNER_EMAIL;
const ownerPassword = process.env.OWNER_PASSWORD;
if (!ownerEmail || !ownerPassword) {
  console.error('Set OWNER_EMAIL and OWNER_PASSWORD before running this script.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id });

const auth = getAuth();
const db = getFirestore();
db.settings({ databaseId: 'default' });

async function fixOwner() {
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(ownerEmail);
      userRecord = await auth.updateUser(userRecord.uid, { password: ownerPassword, emailVerified: true });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      userRecord = await auth.createUser({ email: ownerEmail, password: ownerPassword, emailVerified: true, displayName: 'Super Admin' });
    }

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: ownerEmail,
      name: 'Super Admin',
      role: 'admin',
      needsOnboarding: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`Owner profile ensured for ${ownerEmail}.`);
  } catch (error) {
    console.error('Error fixing owner:', error);
    process.exitCode = 1;
  }
}

fixOwner();
