import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK with the project's canonical authDomain.
// The browser origin must still be added separately in Firebase Authorized Domains.
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling and persistent local caching
// Explicitly using 'default' database ID as verified in the project settings
export const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, 'default');

export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);

// Set log level to avoid repetitive timeout warnings in sandboxed network environments
setLogLevel('error');


