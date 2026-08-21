import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BookOpen, CheckCircle2, Clock3, FileUp, Loader2, RefreshCw, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../../lib/firebase';
import { publishCurriculumBook } from '../../lib/curriculumPublisher';
import { YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';
import type { CurriculumBook } from '../../types/curriculum';

const inputClass = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'superseded';
type FormState = { title: string; subject: string; gradeKey: string; part: string; pdfFile?: File; manifestFile?: File; replaceBookId: string };

function approvalStatus(book: CurriculumBook & { approvalStatus?: ApprovalStatus }): ApprovalStatus {
  if (book.approvalStatus) return book.approvalStatus;
  return book.isActive === false ? 'rejected' : 'approved';
}

export default function CurriculumManager() {
  const [books, setBooks] = useState<(CurriculumBook & { approvalStatus?: ApprovalStatus; updatedAt?: string; createdAt?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | ApprovalStatus>('all');
  const [form, setForm] = useState<FormState>({ title: '', subject: '', gradeKey: 'grade_7', part: 'part_1', replaceBookId: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'curriculumBooks'), (snapshot) => {
      setBooks(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CurriculumBook & { approvalStatus?: ApprovalStatus; updatedAt?: string; createdAt?: string })));
      setLoading(false);
    }, (snapshotError) => {
      setError(snapshotError.message || 'تعذر تحميل فهرس المناهج');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const visibleBooks = useMemo(() => books
    .filter((book) => filter === 'all' || approvalStatus(book) === filter)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))), [books, filter]);

  const runStatusChange = async (book: CurriculumBook & { approvalStatus?: ApprovalStatus }, nextStatus: ApprovalStatus) => {
    setSaving(true);
    setError('');
    try {
      const actorId = auth.currentUser?.uid || '';
      await setDoc(doc(db, 'curriculumBooks', book.id), {
        isActive: nextStatus === 'approved',
        approvalStatus: nextStatus,
        reviewedBy: actorId,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await setDoc(doc(collection(db, 'auditLogs')), {
        action: nextStatus === 'approved' ? 'approve' : 'reject',
        entity: 'curriculumBooks',
        entityId: book.id,
        actorId,
        createdAt: new Date().toISOString(),
        metadata: { title: book.title, status: nextStatus },
      });
      toast.success(nextStatus === 'approved' ? 'تم اعتماد الكتاب وإتاحته للطلاب' : 'تم إيقاف الكتاب عن العرض');
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : 'تعذر تحديث حالة الكتاب';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.pdfFile || !form.manifestFile) {
      setError('أكمل العنوان والمادة واختر ملف PDF وملف JSON المعالج');
      return;
    }
    setSaving(true);
    setError('');
    setProgress(5);
    try {
      const actorId = auth.currentUser?.uid || '';
      const published = await publishCurriculumBook({
        title: form.title,
        subject: form.subject,
        gradeKey: form.gradeKey as any,
        part: form.part as 'part_1' | 'part_2' | 'combined',
        pdfFile: form.pdfFile,
        manifestFile: form.manifestFile,
        createdBy: actorId,
        onProgress: setProgress,
      });
      await setDoc(doc(db, 'curriculumBooks', published.id), {
        approvalStatus: 'pending',
        updatedAt: new Date().toISOString(),
        source: 'official',
        isOfficial: true,
        isActive: false,
      }, { merge: true });
      if (form.replaceBookId) {
        await setDoc(doc(db, 'curriculumBooks', form.replaceBookId), {
          isActive: false,
          approvalStatus: 'superseded',
          replacedBy: published.id,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await setDoc(doc(collection(db, 'auditLogs')), {
        action: form.replaceBookId ? 'update' : 'publish',
        entity: 'curriculumBooks',
        entityId: published.id,
        actorId,
        createdAt: new Date().toISOString(),
        metadata: { title: published.title, gradeKey: published.gradeKey, subject: published.subject, replacesBookId: form.replaceBookId || null },
      });
      setForm({ title: '', subject: '', gradeKey: 'grade_7', part: 'part_1', replaceBookId: '' });
      setProgress(100);
      toast.success(form.replaceBookId ? 'تم رفع الإصدار الجديد وأصبح قيد اعتماد المالك' : 'تم رفع الكتاب وأصبح قيد المراجعة قبل إتاحته للطلاب');
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : 'تعذر رفع الكتاب';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div>
        <p className="text-sm font-semibold text-blue-600">إدارة المحتوى الرسمي</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">مدير المناهج اليمنية</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">يُرفع PDF للعرض وJSON المعالج للبحث والقراءة والاختبارات. لا يظهر الكتاب للطلاب إلا إذا كان نشطاً ومعتمداً.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"><BookOpen className="h-4 w-4" /> {books.length} كتاباً في الفهرس</div>
    </div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}

    <div className="grid gap-3 sm:grid-cols-3"><Metric label="معتمد ونشط" value={books.filter((book) => approvalStatus(book) === 'approved' && book.isActive !== false).length} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" /><Metric label="قيد المراجعة" value={books.filter((book) => approvalStatus(book) === 'pending').length} icon={<Clock3 className="h-5 w-5" />} color="amber" /><Metric label="نسخ موقوفة" value={books.filter((book) => ['rejected', 'superseded'].includes(approvalStatus(book))).length} icon={<XCircle className="h-5 w-5" />} color="rose" /></div>

    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
      <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-white p-2 text-blue-700 shadow-sm dark:bg-gray-800"><UploadCloud className="h-5 w-5" /></div><div><h3 className="font-bold text-gray-900 dark:text-white">رفع كتاب رسمي أو تحديث إصدار</h3><p className="text-xs text-gray-600 dark:text-gray-300">اختر ملف JSON الناتج من المعالجة، وسيحفظ في Storage وتبقى بيانات الفهرسة الخفيفة في Firestore.</p></div></div>
      {form.replaceBookId && <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900"><span>وضع تحديث النسخة السابقة: {books.find((book) => book.id === form.replaceBookId)?.title || form.replaceBookId}</span><button type="button" onClick={() => setForm({ ...form, replaceBookId: '' })} className="underline">إلغاء</button></div>}
      <div className="grid gap-4 md:grid-cols-2"><Field label="عنوان الكتاب" value={form.title} onChange={(value) => setForm({ ...form, title: value })} /><Field label="المادة" value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} /><Select label="الصف" value={form.gradeKey} onChange={(value) => setForm({ ...form, gradeKey: value })} options={YEMEN_GRADE_OPTIONS.map((option) => ({ id: option.key, name: option.labelAr }))} /><Select label="الجزء" value={form.part} onChange={(value) => setForm({ ...form, part: value })} options={[{ id: 'part_1', name: 'الجزء الأول' }, { id: 'part_2', name: 'الجزء الثاني' }, { id: 'combined', name: 'الجزء الأول والثاني' }]} /></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><FileField label="كتاب PDF" accept="application/pdf" onChange={(file) => setForm({ ...form, pdfFile: file })} fileName={form.pdfFile?.name} /><FileField label="JSON الصفحات المعالج" accept="application/json,.json" onChange={(file) => setForm({ ...form, manifestFile: file })} fileName={form.manifestFile?.name} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={saving} onClick={publish} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{saving ? `جارٍ الرفع ${progress}%` : form.replaceBookId ? 'رفع الإصدار الجديد' : 'رفع واعتماد الكتاب'}</button>{saving && <div className="h-2 min-w-48 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>}</div>
    </div>

    <div className="flex flex-wrap gap-2 rounded-xl bg-gray-100 p-2 dark:bg-gray-900">{(['all', 'approved', 'pending', 'rejected', 'superseded'] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === item ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>{item === 'all' ? 'الكل' : item === 'approved' ? 'المعتمد' : item === 'pending' ? 'قيد المراجعة' : item === 'rejected' ? 'الموقوف' : 'النسخ السابقة'}</button>)}</div>
    {loading ? <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : <div className="space-y-3">{visibleBooks.length === 0 ? <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">لا توجد كتب في هذا التصنيف.</div> : visibleBooks.map((book) => <BookRow key={book.id} book={book} saving={saving} onApprove={() => runStatusChange(book, 'approved')} onReject={() => runStatusChange(book, 'rejected')} onUpdate={() => setForm({ title: book.title, subject: book.subject, gradeKey: book.gradeKey || 'grade_7', part: book.part || 'combined', replaceBookId: book.id })} />)}</div>}
  </div>;
}

function BookRow({ book, saving, onApprove, onReject, onUpdate }: { key?: string; book: CurriculumBook & { approvalStatus?: ApprovalStatus }; saving: boolean; onApprove: () => void; onReject: () => void; onUpdate: () => void }) {
  const status = approvalStatus(book);
  return <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-gray-900 dark:text-white">{book.title}</p><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{book.grade}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{status === 'approved' ? 'معتمد' : status === 'pending' ? 'قيد المراجعة' : status === 'superseded' ? 'نسخة سابقة' : 'موقوف'}</span></div><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{book.subject} • {book.part || 'نسخة موحدة'} • {book.totalPageCount || 0} صفحة • {book.source === 'official' ? 'منهج رسمي' : 'محتوى مدرسة'}</p></div><div className="flex shrink-0 flex-wrap gap-2">{status !== 'approved' && status !== 'superseded' && <button type="button" disabled={saving} onClick={onApprove} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">اعتماد</button>}{status !== 'superseded' && <button type="button" disabled={saving} onClick={onReject} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50">إيقاف</button>}{status === 'approved' && <button type="button" disabled={saving} onClick={onUpdate} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />تحديث</button>}</div></div>;
}

function Metric({ label, value, icon, color }: { label: string; value: number; icon: ReactNode; color: 'emerald' | 'amber' | 'rose' }) { const colors = { emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }; return <div className={`flex items-center gap-3 rounded-2xl p-4 ${colors[color]}`}><div>{icon}</div><div><p className="text-xs font-semibold opacity-80">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { id: string; name: string }[] }) { return <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} appearance-none`}>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>; }
function FileField({ label, accept, onChange, fileName }: { label: string; accept: string; onChange: (file?: File) => void; fileName?: string }) { return <label className="block cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">{label}<input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0])} className="mt-1 block w-full rounded-xl border border-dashed border-gray-300 bg-white p-2 text-xs dark:border-gray-600 dark:bg-gray-900" />{fileName && <span className="mt-1 block truncate text-xs font-normal text-emerald-700">{fileName}</span>}</label>; }
