import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Link2, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../../lib/store';
import { approveStudentLinkRequest, listStudentLinkRequests, rejectStudentLinkRequest, type StudentLinkRequest } from '../../../lib/studentLinkage';

/**
 * EduSmart admin surface: decisions are explicit, reversible through audit,
 * and never represented as fabricated counts or reviews.
 */
export default function StudentLinkRequests() {
  const { user, language } = useStore();
  const [requests, setRequests] = useState<StudentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryText, setQueryText] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listStudentLinkRequests({ status: 'pending', schoolId: user?.role === 'principal' ? user.schoolId : undefined });
      setRequests(result.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)));
    } catch (loadError) {
      console.error('Unable to load link requests:', loadError);
      setError(language === 'ar' ? 'تعذر تحميل الطلبات. تأكد من أن حساب Firebase يملك صلاحية الأدمن.' : 'Unable to load requests. Verify that this Firebase account has admin access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user?.uid]);

  const filtered = requests.filter((request) => [request.studentName, request.identifier, request.schoolName].some((value) => value.toLowerCase().includes(queryText.trim().toLowerCase())));

  const review = async (request: StudentLinkRequest, action: 'approve' | 'reject') => {
    setBusyId(request.id);
    try {
      if (action === 'approve') {
        await approveStudentLinkRequest(request.id, user?.uid);
        toast.success(language === 'ar' ? `تم اعتماد ربط ${request.studentName}.` : `Link approved for ${request.studentName}.`);
      } else {
        const note = window.prompt(language === 'ar' ? 'سبب الرفض (اختياري)' : 'Reason for rejection (optional)') || '';
        await rejectStudentLinkRequest(request.id, note, user?.uid);
        toast.success(language === 'ar' ? 'تم رفض الطلب.' : 'Request rejected.');
      }
      setRequests((current) => current.filter((item) => item.id !== request.id));
    } catch (reviewError) {
      console.error('Unable to review link request:', reviewError);
      toast.error(language === 'ar' ? 'تعذر حفظ قرار المراجعة. تحقق من الصلاحيات وحالة المعرف.' : 'Unable to save the review decision. Check permissions and identifier status.');
    } finally {
      setBusyId('');
    }
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:flex-row sm:items-center sm:p-8"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300"><Link2 className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Admin · Identity review</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{language === 'ar' ? 'طلبات ربط الطلاب' : 'Student link requests'}</h1><p className="mt-2 text-sm leading-6 text-slate-300">{language === 'ar' ? 'اعتمد الطلب فقط بعد مطابقة الاسم والصف والمعرف مع سجل المدرسة.' : 'Approve only after matching the name, grade, and identifier with the school record.'}</p></div></div><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15"><RefreshCw className="h-4 w-4" />{language === 'ar' ? 'تحديث' : 'Refresh'}</button></header>
    {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6"><div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} className="input-field ps-10" placeholder={language === 'ar' ? 'ابحث بالاسم أو المعرف أو المدرسة' : 'Search by name, identifier, or school'} /></div></section>
    {loading ? <div className="flex h-52 items-center justify-center text-slate-500"><Loader2 className="me-2 h-5 w-5 animate-spin" />{language === 'ar' ? 'جاري تحميل الطلبات...' : 'Loading requests...'}</div> : !filtered.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/30"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-bold text-slate-800 dark:text-white">{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p><p className="mt-1 text-sm text-slate-500">{language === 'ar' ? 'ستظهر الطلبات الجديدة هنا بعد إرسالها.' : 'New requests will appear here after submission.'}</p></div> : <div className="space-y-4">{filtered.map((request) => <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20"><Clock3 className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900 dark:text-white">{request.studentName}</h2><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{request.identifier}</span></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{request.schoolName || '—'} · {request.gradeKey}</p><p className="mt-2 text-xs text-slate-400">{new Date(request.requestedAt).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')}</p></div></div><div className="flex gap-2"><button type="button" disabled={Boolean(busyId)} onClick={() => void review(request, 'reject')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><XCircle className="h-4 w-4" />{language === 'ar' ? 'رفض' : 'Reject'}</button><button type="button" disabled={Boolean(busyId)} onClick={() => void review(request, 'approve')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busyId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{language === 'ar' ? 'اعتماد' : 'Approve'}</button></div></div></article>)}</div>}
  </div>;
}
