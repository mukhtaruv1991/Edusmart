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
const app = initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling and persistent local caching
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const storage = getStorage(app);

// Set log level to avoid repetitive timeout warnings in sandboxed network environments
setLogLevel('error');


