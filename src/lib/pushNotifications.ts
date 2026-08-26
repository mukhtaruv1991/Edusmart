import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseApp } from './firebase';

const PUSH_SCOPE = '/firebase-cloud-messaging-push-scope';

export class PushConfigurationError extends Error {
  constructor(message = 'PUSH_CONFIGURATION_MISSING') {
    super(message);
    this.name = 'PushConfigurationError';
  }
}

async function getMessagingRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) throw new PushConfigurationError('SERVICE_WORKER_UNSUPPORTED');
  return navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: PUSH_SCOPE });
}

export async function enableDeviceNotifications(): Promise<string> {
  if (!auth.currentUser?.uid) throw new Error('AUTH_REQUIRED');
  if (!('Notification' in window)) throw new PushConfigurationError('NOTIFICATION_UNSUPPORTED');
  if (Notification.permission === 'denied') throw new Error('NOTIFICATION_DENIED');
  const supported = await isSupported();
  if (!supported) throw new PushConfigurationError('MESSAGING_UNSUPPORTED');
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new PushConfigurationError();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('NOTIFICATION_DENIED');
  const registration = await getMessagingRegistration();
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('TOKEN_NOT_CREATED');
  await setDoc(doc(db, 'notificationTokens', auth.currentUser.uid), {
    userId: auth.currentUser.uid,
    token,
    platform: 'web',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return token;
}

export async function listenForForegroundNotifications(handler: (payload: MessagePayload) => void): Promise<() => void> {
  if (!(await isSupported())) return () => undefined;
  return onMessage(getMessaging(firebaseApp), handler);
}
