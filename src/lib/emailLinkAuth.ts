import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, type User } from 'firebase/auth';
import { auth } from './firebase';

export const EMAIL_LINK_DRAFT_KEY = 'edusmart-email-link-draft';

export interface RegistrationDraft {
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
}

export function getEmailLinkActionUrl() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/email-link`;
}

export function saveRegistrationDraft(draft: Omit<RegistrationDraft, 'createdAt'>) {
  localStorage.setItem(EMAIL_LINK_DRAFT_KEY, JSON.stringify({ ...draft, createdAt: new Date().toISOString() }));
}

export function readRegistrationDraft(): RegistrationDraft | null {
  try {
    const raw = localStorage.getItem(EMAIL_LINK_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegistrationDraft>;
    if (typeof parsed.name !== 'string' || typeof parsed.email !== 'string' || typeof parsed.phoneNumber !== 'string') return null;
    return { name: parsed.name, email: parsed.email, phoneNumber: parsed.phoneNumber, createdAt: parsed.createdAt || '' };
  } catch {
    return null;
  }
}

export function clearRegistrationDraft() {
  localStorage.removeItem(EMAIL_LINK_DRAFT_KEY);
}

export async function sendEmailLink(email: string) {
  await sendSignInLinkToEmail(auth, email, {
    url: getEmailLinkActionUrl(),
    handleCodeInApp: true,
  });
}

export function isEmailLinkUrl() {
  return typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href);
}

export async function completeEmailLink(email: string): Promise<User> {
  if (!isEmailLinkUrl()) throw new Error('INVALID_EMAIL_LINK');
  const credential = await signInWithEmailLink(auth, email, window.location.href);
  return credential.user;
}

export function authErrorMessage(error: unknown, language: 'ar' | 'en') {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  if (code === 'auth/unauthorized-domain') {
    return language === 'ar'
      ? 'نطاق المعاينة غير مسموح في Firebase. أضف نطاق الموقع إلى Authentication > Settings > Authorized domains ثم أعد المحاولة.'
      : 'This preview domain is not authorized in Firebase. Add it under Authentication > Settings > Authorized domains and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return language === 'ar'
      ? 'تسجيل الدخول برابط البريد غير مفعّل في Firebase. فعّله من Authentication > Sign-in method > Email/Password ثم فعّل Email link.'
      : 'Email-link sign-in is not enabled in Firebase. Enable Email/Password and Email link under Authentication > Sign-in method.';
  }
  if (code === 'auth/invalid-email') {
    return language === 'ar' ? 'أدخل بريداً إلكترونياً صحيحاً.' : 'Enter a valid email address.';
  }
  if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
    return language === 'ar' ? 'رابط التحقق منتهي أو مستخدم. اطلب رابطاً جديداً.' : 'This verification link is expired or already used. Request a new one.';
  }
  if (code === 'auth/email-already-in-use') {
    return language === 'ar' ? 'هذا البريد مسجل مسبقاً. استخدم تسجيل الدخول عبر الرابط.' : 'This email is already registered. Use email-link sign in.';
  }
  if (code === 'auth/too-many-requests') {
    return language === 'ar' ? 'تم تجاوز عدد المحاولات. انتظر قليلاً ثم حاول مرة أخرى.' : 'Too many attempts. Wait a moment and try again.';
  }
  return language === 'ar' ? 'تعذر إكمال المصادقة. تحقق من الاتصال وحاول مرة أخرى.' : 'Authentication failed. Check your connection and try again.';
}
