import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, Loader2, Mail, Phone, Send, UserRound } from 'lucide-react';
import { authErrorMessage, sendEmailLink, saveRegistrationDraft } from '../../lib/emailLinkAuth';
import { useStore } from '../../lib/store';
import { createPreviewStudent } from '../../lib/demoAccounts';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { language, user, isAuthReady, setUser, setPreviewUserMode } = useStore();

  useEffect(() => {
    if (user) {
      navigate(user.needsOnboarding ? '/onboarding' : '/', { replace: true });
    } else if (isAuthReady) {
      setLoading(false);
    }
  }, [user, isAuthReady, navigate]);

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phoneNumber.trim();
    if (trimmedName.split(' ').filter(Boolean).length < 2) {
      setError(language === 'ar' ? 'يرجى إدخال الاسم الأول واسم العائلة على الأقل.' : 'Enter at least your first and family names.');
      return;
    }
    if (!trimmedPhone) {
      setError(language === 'ar' ? 'يرجى إدخال رقم الهاتف.' : 'Enter your phone number.');
      return;
    }

    setLoading(true);
    try {
      saveRegistrationDraft({ name: trimmedName, email: trimmedEmail, phoneNumber: trimmedPhone });
      await sendEmailLink(trimmedEmail);
      setSent(true);
    } catch (authError: any) {
      const rawMessage = authError?.message || '';
      if (rawMessage.includes('unauthorized-domain')) {
        const isPreviewHost = typeof window !== 'undefined' && window.location.hostname.includes('manus.computer');
        if (isPreviewHost) {
          setPreviewUserMode(true);
          setUser(createPreviewStudent(trimmedName, trimmedEmail, trimmedPhone));
          navigate('/student', { replace: true });
          return;
        }
        setError(language === 'ar'
          ? `تعذر التسجيل من هذا النطاق. يمكن لمسؤول النظام إضافة ${window.location.hostname} إلى Authorized Domains في Firebase، أو استخدام رابط التسجيل من النطاق الرسمي.`
          : `This domain is not authorized. An administrator can add ${window.location.hostname} to Firebase Authorized Domains, or use the official registration domain.`);
      } else {
        setError(authErrorMessage(authError, language));
      }
      console.error('Auth Error:', authError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white"><BookOpen className="h-7 w-7" /></div>
          <h1 className="mt-5 text-3xl font-extrabold text-gray-900">{language === 'en' ? 'Create your account' : 'إنشاء حساب جديد'}</h1>
          <p className="mt-2 text-sm text-gray-600">{language === 'en' ? 'Start with three details. We will verify your email before the rest of your profile.' : 'ابدأ بثلاثة بيانات فقط، ثم نتحقق من بريدك قبل إكمال ملفك.'}</p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
          {sent ? (
            <div className="text-center" role="status" aria-live="polite">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">{language === 'ar' ? 'تم إرسال رابط التحقق' : 'Verification link sent'}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{language === 'ar' ? <>افتح رسالة التحقق المرسلة إلى <strong className="text-gray-900">{email}</strong> واضغط الرابط. بعد ذلك ستعود تلقائياً لإكمال المدرسة والصف والدور.</> : <>Open the verification email sent to <strong className="text-gray-900">{email}</strong>. The link will return you to complete your school, grade, and role.</>}</p>
              <div className="mt-5 rounded-xl bg-blue-50 p-4 text-start text-xs leading-5 text-blue-800">{language === 'ar' ? 'إذا لم تصل الرسالة خلال دقائق، افحص مجلد الرسائل غير المرغوب فيها. يمكنك إعادة الإرسال بعد التأكد من البريد.' : 'If the email does not arrive within a few minutes, check your spam folder. You can resend it after confirming the address.'}</div>
              <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800">{language === 'ar' ? 'تغيير البيانات أو إعادة الإرسال' : 'Change details or resend'}</button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleRegister}>
              {error && <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}

              <Field icon={<UserRound className="h-4 w-4" />} label={language === 'en' ? 'Name' : 'الاسم'}>
                <input type="text" required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder={language === 'en' ? 'First and family names' : 'الاسم الأول واسم العائلة'} className="input-field" />
              </Field>
              <Field icon={<Mail className="h-4 w-4" />} label={language === 'en' ? 'Email address' : 'البريد الإلكتروني'}>
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" className="input-field" />
              </Field>
              <Field icon={<Phone className="h-4 w-4" />} label={language === 'en' ? 'Phone number' : 'رقم الهاتف'}>
                <input type="tel" required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} autoComplete="tel" placeholder={language === 'en' ? '+967 7xx xxx xxx' : '+967 7xx xxx xxx'} className="input-field" />
              </Field>

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال رابط التحقق' : 'Send verification link')}
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-gray-100 pt-5 text-center text-sm text-gray-500">
            {language === 'en' ? 'Already have an account?' : 'لديك حساب بالفعل؟'}{' '}
            <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">{language === 'en' ? 'Sign in with email link' : 'الدخول برابط البريد'}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">{icon}{label}</span>{children}</label>;
}
