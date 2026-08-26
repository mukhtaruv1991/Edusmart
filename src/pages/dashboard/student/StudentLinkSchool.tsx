import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, Building2, CheckCircle2, Clock3, Link2, Loader2, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';
import { getGradeKey, YEMEN_GRADE_OPTIONS } from '../../../lib/gradeCatalog';
import { cancelStudentLinkRequest, submitStudentLinkRequest, type StudentLinkRequest } from '../../../lib/studentLinkage';

/**
 * EduSmart design reminder: this workflow uses calm status colors, clear state
 * transitions, and no hidden action; a student always knows who must review the request.
 */
export default function StudentLinkSchool() {
  const { user, language } = useStore();
  const [identifier, setIdentifier] = useState(user?.studentIdentifier || '');
  const [studentName, setStudentName] = useState(user?.name || '');
  const [gradeKey, setGradeKey] = useState(user?.gradeKey || '');
  const [requests, setRequests] = useState<StudentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'studentLinkRequests'), where('uid', '==', user.uid)));
      setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StudentLinkRequest)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)));
    } catch (loadError) {
      console.error('Unable to load student link requests:', loadError);
      setError(language === 'ar' ? 'تعذر تحميل طلبات الربط. سجّل الدخول بحساب Firebase حقيقي ثم أعد المحاولة.' : 'Unable to load link requests. Sign in with a real Firebase account and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRequests(); }, [user?.uid]);

  const latest = requests[0];
  const canSubmit = useMemo(() => Boolean(identifier.trim() && studentName.trim() && gradeKey && !saving), [identifier, studentName, gradeKey, saving]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await submitStudentLinkRequest({ identifier, studentName, gradeKey, uid: user?.uid });
      toast.success(language === 'ar' ? 'تم إرسال طلب الربط إلى إدارة المدرسة.' : 'The link request was sent to the school.');
      await loadRequests();
    } catch (submitError) {
      const code = submitError instanceof Error ? submitError.message : '';
      const messages: Record<string, string> = {
        AUTH_REQUIRED: 'يجب تسجيل الدخول بحساب حقيقي قبل إرسال الطلب.',
        LINK_FIELDS_REQUIRED: 'أكمل المعرف والاسم والصف.',
        INVALID_STUDENT_IDENTIFIER: 'المعرف غير موجود. اطلبه من إدارة المدرسة.',
        USED_STUDENT_IDENTIFIER: 'هذا المعرف مستخدم أو غير متاح.',
        STUDENT_IDENTIFIER_NAME_MISMATCH: 'الاسم لا يطابق الاسم المسجل لدى المدرسة.',
        STUDENT_IDENTIFIER_GRADE_MISMATCH: 'الصف لا يطابق الصف المرتبط بالمعرف.',
      };
      setError(language === 'ar' ? messages[code] || 'تعذر إرسال طلب الربط. تحقق من البيانات وحاول مرة أخرى.' : 'Unable to submit the link request. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelStudentLinkRequest(requestId, user?.uid);
      toast.success(language === 'ar' ? 'تم إلغاء الطلب.' : 'Request cancelled.');
      await loadRequests();
    } catch (cancelError) {
      console.error('Unable to cancel link request:', cancelError);
      toast.error(language === 'ar' ? 'تعذر إلغاء الطلب.' : 'Unable to cancel the request.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-blue-700 to-cyan-600 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
        <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Link2 className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">EduSmart · Student identity</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{language === 'ar' ? 'ربط المدرسة والمعرف' : 'Link school and student ID'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">{language === 'ar' ? 'أرسل المعرف الذي سلمتك إياه المدرسة. ستراجع الإدارة الطلب قبل تفعيل المواد والصف والحساب الأكاديمي.' : 'Submit the identifier issued by your school. An administrator reviews it before your classes and curriculum are activated.'}</p></div></div>
      </header>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}

      {latest && <StatusCard request={latest} language={language} onCancel={latest.status === 'pending' ? () => void handleCancel(latest.id) : undefined} />}

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <div className="mb-6 flex items-center gap-3"><Building2 className="h-5 w-5 text-blue-600" /><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">{language === 'ar' ? 'طلب جديد' : 'New request'}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{language === 'ar' ? 'يجب أن تطابق البيانات سجل المدرسة حرفيًا.' : 'The details must match the school record exactly.'}</p></div></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'معرف الطالب' : 'Student identifier'}</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value.toUpperCase())} className="input-field" placeholder="YEM-2026-0001" autoComplete="off" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الاسم الرباعي' : 'Full name'}</span><input value={studentName} onChange={(event) => setStudentName(event.target.value)} className="input-field" autoComplete="name" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الصف الدراسي' : 'Grade'}</span><select value={gradeKey} onChange={(event) => setGradeKey(event.target.value)} className="input-field"><option value="">{language === 'ar' ? 'اختر الصف' : 'Select grade'}</option>{YEMEN_GRADE_OPTIONS.map((grade) => <option key={grade.key} value={getGradeKey(grade.labelAr)}>{grade.labelAr}</option>)}</select></label>
        </div>
        <button type="submit" disabled={!canSubmit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{saving ? (language === 'ar' ? 'جارٍ إرسال الطلب...' : 'Submitting...') : (language === 'ar' ? 'إرسال طلب الربط' : 'Submit link request')}</button>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{language === 'ar' ? 'سجل الطلبات' : 'Request history'}</h2>{loading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}</div>{!loading && !requests.length ? <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">{language === 'ar' ? 'لا توجد طلبات ربط بعد.' : 'No link requests yet.'}</p> : <div className="space-y-3">{requests.map((request) => <div key={request.id}><StatusCard request={request} language={language} onCancel={request.status === 'pending' ? () => void handleCancel(request.id) : undefined} compact /></div>)}</div>}</section>
    </div>
  );
}

function StatusCard({ request, language, onCancel, compact = false }: { request: StudentLinkRequest; language: 'ar' | 'en'; onCancel?: () => void; compact?: boolean }) {
  const state = request.status === 'approved' ? { label: 'تم الاعتماد', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : request.status === 'rejected' ? { label: 'مرفوض', icon: XCircle, classes: 'bg-red-50 text-red-700 border-red-200' } : request.status === 'cancelled' ? { label: 'ملغى', icon: XCircle, classes: 'bg-slate-100 text-slate-600 border-slate-200' } : { label: 'قيد مراجعة المدرسة', icon: Clock3, classes: 'bg-amber-50 text-amber-700 border-amber-200' };
  const Icon = state.icon;
  return <article className={`rounded-2xl border p-4 ${state.classes}`}><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">{language === 'ar' ? state.label : request.status}</p><p className="mt-1 text-sm">{request.schoolName || (language === 'ar' ? 'مدرسة مرتبطة بالمعرف' : 'School attached to the identifier')} · {request.identifier}</p>{!compact && <p className="mt-2 text-xs opacity-80">{language === 'ar' ? 'بعد الاعتماد ستظهر مواد صفك تلقائيًا.' : 'Your grade curriculum will appear after approval.'}</p>}</div></div>{onCancel && <button type="button" onClick={onCancel} className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold hover:bg-white">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>}</div></article>;
}
