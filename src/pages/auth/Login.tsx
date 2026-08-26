import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, KeyRound, Loader2, Mail, Send } from 'lucide-react';
import { authErrorMessage, sendEmailLink } from '../../lib/emailLinkAuth';
import { ensureOwnerProfile, ownerAuthErrorMessage, OWNER_EMAIL, sendOwnerPasswordReset, signInOwner } from '../../lib/ownerAuth';
import { useStore } from '../../lib/store';
import { DEMO_ACCOUNTS } from '../../lib/demoAccounts';

export default function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [ownerMode, setOwnerMode] = useState(false);
  const navigate = useNavigate();
  const { language, user, isAuthReady, previewOwnerMode, setUser, setPreviewOwnerMode, setPreviewUserMode } = useStore();

  useEffect(() => {
    if (user) {
      navigate(previewOwnerMode && user.email === OWNER_EMAIL ? '/admin/control-center' : user.needsOnboarding ? '/onboarding' : '/', { replace: true });
    } else if (isAuthReady) {
      setLoading(false);
    }
  }, [user, isAuthReady, previewOwnerMode, navigate]);

  const handleOwnerPasswordReset = async () => {
    setError('');
    setLoading(true);
    try {
      await sendOwnerPasswordReset(email || OWNER_EMAIL);
      setError(language === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريد المالك.' : 'A password reset link was sent to the owner email.');
    } catch (authError) {
      setError(ownerAuthErrorMessage(authError, language));
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const isPreviewHost = typeof window !== 'undefined' && window.location.hostname.includes('manus.computer');
    const isPreviewCredential = (email || OWNER_EMAIL).trim().toLowerCase() === OWNER_EMAIL && password === '123123';
    try {
      const credentials = await signInOwner(email || OWNER_EMAIL, password);
      await ensureOwnerProfile(credentials.user);
      setPreviewOwnerMode(false);
      navigate('/', { replace: true });
    } catch (authError) {
      // Preview-only fallback: this is deliberately limited to the owner account,
      // the fixed preview password, and the temporary preview host. It never runs
      // on a production domain and does not change Firebase security rules.
      if (isPreviewHost && isPreviewCredential) {
        const now = new Date().toISOString();
        setPreviewOwnerMode(true);
        setUser({
          uid: 'preview-owner',
          email: OWNER_EMAIL,
          name: 'المالك والمشرف العام',
          role: 'admin',
          schoolStatus: 'none',
          needsOnboarding: false,
          createdAt: now,
        });
        navigate('/admin/control-center', { replace: true });
        return;
      }

      setError(ownerAuthErrorMessage(authError, language));
      console.error('Owner auth error:', authError);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    const account = DEMO_ACCOUNTS.find((item) => item.email === demoEmail);
    if (!account) return;
    setError('');
    setPreviewOwnerMode(false);
    setPreviewUserMode(true);
    setUser(account);
    navigate(`/${account.role}`, { replace: true });
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      await sendEmailLink(trimmedEmail);
      setSent(true);
    } catch (authError: any) {
      const rawMessage = authError?.message || '';
      if (rawMessage.includes('unauthorized-domain')) {
        setError(language === 'ar'
          ? `خطأ: النطاق الحالي غير مصرح به في Firebase. يرجى إضافة النطاق ${window.location.hostname} إلى Authorized Domains في إعدادات Firebase.`
          : `Error: Current domain is not authorized. Please add ${window.location.hostname} to Authorized Domains in Firebase Settings.`);
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
          <h1 className="mt-5 text-3xl font-extrabold text-gray-900">{language === 'en' ? 'Sign in to EduSmart' : 'تسجيل الدخول إلى EduSmart'}</h1>
          <p className="mt-2 text-sm text-gray-600">{language === 'en' ? 'No password to remember. We will send a secure sign-in link to your email.' : 'لا حاجة لحفظ كلمة مرور؛ سنرسل رابط دخول آمن إلى بريدك الإلكتروني.'}</p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
          {sent ? (
            <div className="text-center" role="status" aria-live="polite">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">{language === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{language === 'ar' ? <>أرسلنا رابط الدخول إلى <strong className="text-gray-900">{email}</strong>. اضغط الرابط للعودة إلى التطبيق.</> : <>We sent a sign-in link to <strong className="text-gray-900">{email}</strong>. Open it to return to the app.</>}</p>
              <div className="mt-5 rounded-xl bg-blue-50 p-4 text-start text-xs leading-5 text-blue-800">{language === 'ar' ? 'افحص مجلد الرسائل غير المرغوب فيها إذا لم تصل الرسالة. الرابط صالح للاستخدام مرة واحدة.' : 'Check your spam folder if needed. The link can be used once.'}</div>
              <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800">{language === 'ar' ? 'إرسال رابط جديد' : 'Send another link'}</button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={ownerMode ? handleOwnerLogin : handleLogin}>
              {error && <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}
              <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"><Mail className="h-4 w-4" />{language === 'en' ? 'Email address' : 'البريد الإلكتروني'}</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder={ownerMode ? OWNER_EMAIL : 'name@example.com'} className="input-field" /></label>
              {ownerMode ? (
                <>
                  <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"><KeyRound className="h-4 w-4" />{language === 'en' ? 'Owner password' : 'كلمة مرور المالك'}</span><input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="input-field" /></label>
                  <button type="button" onClick={handleOwnerPasswordReset} disabled={loading} className="text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-60">{language === 'ar' ? 'نسيت كلمة مرور المالك؟ أرسل رابط إعادة التعيين' : 'Forgot the owner password? Send a reset link'}</button>
                </>
              ) : null}
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : ownerMode ? <KeyRound className="h-4 w-4" /> : <Send className="h-4 w-4" />}{loading ? (language === 'ar' ? 'جاري التحقق...' : 'Checking...') : ownerMode ? (language === 'ar' ? 'دخول المالك' : 'Owner sign in') : (language === 'ar' ? 'إرسال رابط الدخول' : 'Send sign-in link')}</button>
              <button type="button" onClick={() => { setOwnerMode((current) => !current); setEmail((current) => ownerMode ? current : OWNER_EMAIL); setPassword(''); setError(''); }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{ownerMode ? (language === 'ar' ? 'العودة لتسجيل الدخول برابط البريد' : 'Use email link instead') : (language === 'ar' ? 'دخول المالك بكلمة المرور' : 'Owner password sign in')}</button>
            </form>
          )}

          {!sent && (
            <section className="mt-7 border-t border-gray-100 pt-6" aria-labelledby="demo-login-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="demo-login-title" className="text-sm font-bold text-slate-900">تجربة الواجهات بسرعة</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">حسابات معاينة منفصلة للاختبار فقط، ولا تمثل مستخدمين حقيقيين.</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">DEMO</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button key={account.uid} type="button" onClick={() => handleDemoLogin(account.email)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-start text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]">
                    <span className="block text-slate-900">{account.label}</span>
                    <span className="mt-1 block truncate text-[10px] font-normal text-slate-500">{account.email}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-7 border-t border-gray-100 pt-5 text-center text-sm text-gray-500">
            {language === 'en' ? 'New to EduSmart?' : 'جديد في EduSmart؟'}{' '}
            <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">{language === 'en' ? 'Create an account' : 'إنشاء حساب'}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
