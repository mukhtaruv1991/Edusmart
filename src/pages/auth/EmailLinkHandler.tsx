import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { authErrorMessage, completeEmailLink, isEmailLinkUrl, readRegistrationDraft } from '../../lib/emailLinkAuth';
import { useStore } from '../../lib/store';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function EmailLinkHandler() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [needsEmail, setNeedsEmail] = useState(false);
  const navigate = useNavigate();
  const { language } = useStore();

  useEffect(() => {
    const draft = readRegistrationDraft();
    const linkIsValid = isEmailLinkUrl();
    if (!linkIsValid) {
      setError(language === 'ar' ? 'هذا الرابط غير صالح أو لم يعد رابط تحقق من EduSmart.' : 'This is not a valid EduSmart verification link.');
      setLoading(false);
      return;
    }
    if (draft?.email) {
      setEmail(draft.email);
      void finish(draft.email, draft.name);
    } else {
      setNeedsEmail(true);
      setLoading(false);
    }
    // The email-link URL is consumed once; the initial effect must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async (emailToUse: string, draftName?: string) => {
    setLoading(true);
    setError('');
    try {
      const signedInUser = await completeEmailLink(emailToUse.trim().toLowerCase());
      if (draftName && !signedInUser.displayName) {
        await updateProfile(signedInUser, { displayName: draftName });
      }
      navigate(draftName ? '/onboarding' : '/', { replace: true });
    } catch (authError) {
      setError(authErrorMessage(authError, language));
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError(language === 'ar' ? 'أدخل البريد الذي استلم رابط التحقق.' : 'Enter the email that received the verification link.');
      return;
    }
    await finish(email);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100 sm:p-8">
        {loading ? <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" /> : error ? <AlertCircle className="mx-auto h-12 w-12 text-red-500" /> : <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />}
        <h1 className="mt-4 text-xl font-bold text-gray-900">{language === 'ar' ? 'التحقق من رابط البريد' : 'Verifying your email link'}</h1>
        {error ? <p className="mt-3 text-sm leading-6 text-red-700" role="alert">{error}</p> : loading ? <p className="mt-3 text-sm text-gray-600">{language === 'ar' ? 'لحظة من فضلك، جارٍ تسجيل دخولك...' : 'Please wait while we sign you in...'}</p> : null}

        {needsEmail && !loading && !error && <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-start"><label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"><Mail className="h-4 w-4" />{language === 'ar' ? 'البريد المستخدم في التسجيل' : 'Email used to register'}</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="input-field" /></label><button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">{language === 'ar' ? 'متابعة' : 'Continue'}</button></form>}
        {error && <button type="button" onClick={() => navigate('/login', { replace: true })} className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800">{language === 'ar' ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}</button>}
      </div>
    </div>
  );
}
