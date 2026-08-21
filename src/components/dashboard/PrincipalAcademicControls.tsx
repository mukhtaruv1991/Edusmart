import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { BookOpen, CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';
import { createStableKey } from '../../lib/utils';

interface AnyRecord { [key: string]: any }

const SUBJECTS = [
  ['arabic', 'اللغة العربية'], ['mathematics', 'الرياضيات'], ['science', 'العلوم'],
  ['english', 'اللغة الإنجليزية'], ['social-studies', 'الدراسات الاجتماعية'],
  ['islamic-studies', 'التربية الإسلامية'], ['computer', 'الحاسوب'],
  ['physics', 'الفيزياء'], ['chemistry', 'الكيمياء'], ['biology', 'الأحياء'],
];

const inputClass = 'mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export default function PrincipalAcademicControls({ schoolId }: { schoolId: string }) {
  const { user } = useStore();
  const [classes, setClasses] = useState<AnyRecord[]>([]);
  const [overrides, setOverrides] = useState<AnyRecord[]>([]);
  const [exams, setExams] = useState<AnyRecord[]>([]);
  const [overrideForm, setOverrideForm] = useState({ gradeKey: 'grade_7', subjectKey: 'arabic', lessonKey: '', lessonTitle: '', status: 'excluded' });
  const [examForm, setExamForm] = useState({ title: '', classId: '', examType: 'monthly', date: '', durationMinutes: 45, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!schoolId) return undefined;
    const streams = [
      onSnapshot(query(collection(db, 'schoolClasses'), where('schoolId', '==', schoolId)), (snapshot) => setClasses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
      onSnapshot(query(collection(db, 'contentOverrides'), where('schoolId', '==', schoolId)), (snapshot) => setOverrides(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
      onSnapshot(query(collection(db, 'schoolExams'), where('schoolId', '==', schoolId)), (snapshot) => setExams(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
    ];
    return () => streams.forEach((unsubscribe) => unsubscribe());
  }, [schoolId]);

  const selectedClass = useMemo(() => classes.find((item) => item.id === examForm.classId), [classes, examForm.classId]);

  const run = async (action: () => Promise<void>, success: string) => {
    setSaving(true); setError(''); setNotice('');
    try { await action(); setNotice(success); } catch (saveError: any) { setError(saveError?.code === 'permission-denied' ? 'رفض Firebase العملية. تأكد من صلاحية المدير ونشر firestore.rules.' : saveError?.message || 'تعذر الحفظ.'); } finally { setSaving(false); }
  };

  const saveOverride = () => run(async () => {
    if (!overrideForm.lessonTitle.trim()) throw new Error('اكتب اسم الدرس.');
    const lessonKey = overrideForm.lessonKey.trim() || createStableKey(overrideForm.lessonTitle);
    await addDoc(collection(db, 'contentOverrides'), {
      schoolId, gradeKey: overrideForm.gradeKey, subjectKey: overrideForm.subjectKey,
      lessonKey, lessonTitle: overrideForm.lessonTitle.trim(), status: overrideForm.status,
      decidedBy: user?.uid || '', decidedAt: new Date().toISOString(),
    });
    setOverrideForm({ ...overrideForm, lessonKey: '', lessonTitle: '' });
  }, 'تم حفظ قرار المحتوى الدراسي.');

  const saveExam = () => run(async () => {
    if (!examForm.title.trim() || !examForm.classId || !examForm.date) throw new Error('أكمل عنوان الاختبار والصف والتاريخ.');
    if (examForm.examType === 'monthly' && !user?.uid) throw new Error('تعذر تحديد مدير المدرسة.');
    await addDoc(collection(db, 'schoolExams'), {
      schoolId, title: examForm.title.trim(), classId: examForm.classId,
      className: selectedClass?.name || '', gradeKey: selectedClass?.gradeKey || '',
      examType: examForm.examType, date: examForm.date, durationMinutes: Number(examForm.durationMinutes),
      notes: examForm.notes.trim(), status: 'scheduled', createdBy: user?.uid || '',
      teacherId: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setExamForm({ ...examForm, title: '', date: '', notes: '' });
  }, 'تمت جدولة الاختبار.');

  const remove = (collectionName: string, id: string) => run(() => deleteDoc(doc(db, collectionName, id)), 'تم حذف السجل.');

  return <div className="space-y-5" dir="rtl">
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200"><strong>تحكم المدير بالمحتوى والتقويم الاختباري.</strong> يحدد المدير الدروس المقررة أو المستبعدة والاختبارات المركزية، بينما ينشئ المعلم الاختبارات الشهرية لفصوله من صفحة الاختبارات.</div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">{notice}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <FormCard title="قرار محتوى دراسي" icon={<BookOpen className="h-5 w-5" />}>
        <Field label="الصف"><select value={overrideForm.gradeKey} onChange={(event) => setOverrideForm({ ...overrideForm, gradeKey: event.target.value })} className={inputClass}>{YEMEN_GRADE_OPTIONS.map((grade: AnyRecord) => <option key={grade.key} value={grade.key}>{grade.labelAr}</option>)}</select></Field>
        <Field label="المادة"><select value={overrideForm.subjectKey} onChange={(event) => setOverrideForm({ ...overrideForm, subjectKey: event.target.value })} className={inputClass}>{SUBJECTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="عنوان الدرس"><input value={overrideForm.lessonTitle} onChange={(event) => setOverrideForm({ ...overrideForm, lessonTitle: event.target.value })} placeholder="مثال: الوحدة الأولى - الدرس الثاني" className={inputClass} /></Field>
        <Field label="حالة الدرس"><select value={overrideForm.status} onChange={(event) => setOverrideForm({ ...overrideForm, status: event.target.value })} className={inputClass}><option value="included">مقرر ومتاح</option><option value="excluded">محذوف من الخطة</option><option value="required">مطلوب للمراجعة</option></select></Field>
        <button type="button" disabled={saving} onClick={saveOverride} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} حفظ قرار الدرس</button>
      </FormCard>
      <FormCard title="جدولة اختبار المدرسة" icon={<CalendarDays className="h-5 w-5" />}>
        <Field label="عنوان الاختبار"><input value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} placeholder="اختبار الشهر الأول - رياضيات" className={inputClass} /></Field>
        <Field label="الصف والشعبة"><select value={examForm.classId} onChange={(event) => setExamForm({ ...examForm, classId: event.target.value })} className={inputClass}><option value="">اختر الصف</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.grade || item.gradeKey}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="نوع الاختبار"><select value={examForm.examType} onChange={(event) => setExamForm({ ...examForm, examType: event.target.value })} className={inputClass}><option value="monthly">شهري</option><option value="midterm">نصف سنوي</option><option value="final">نهائي</option><option value="diagnostic">تشخيصي</option></select></Field><Field label="المدة بالدقائق"><input type="number" min="10" max="240" value={examForm.durationMinutes} onChange={(event) => setExamForm({ ...examForm, durationMinutes: Number(event.target.value) })} className={inputClass} /></Field></div>
        <Field label="التاريخ"><input type="date" value={examForm.date} onChange={(event) => setExamForm({ ...examForm, date: event.target.value })} className={inputClass} /></Field>
        <Field label="ملاحظات"><textarea value={examForm.notes} onChange={(event) => setExamForm({ ...examForm, notes: event.target.value })} rows={2} className={inputClass} /></Field>
        <button type="button" disabled={saving || classes.length === 0} onClick={saveExam} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} جدولة الاختبار</button>
      </FormCard>
    </div>
    <div className="grid gap-5 lg:grid-cols-2"><ListCard title="قرارات المحتوى الأخيرة">{overrides.length === 0 ? <Empty text="لا توجد قرارات محتوى بعد." /> : overrides.map((item) => <Row key={item.id} title={item.lessonTitle} detail={`${item.gradeKey} · ${item.subjectKey}`} status={item.status === 'excluded' ? 'محذوف' : item.status === 'required' ? 'مطلوب' : 'مقرر'} onDelete={() => remove('contentOverrides', item.id)} />)}</ListCard><ListCard title="الاختبارات المجدولة">{exams.length === 0 ? <Empty text="لا توجد اختبارات مجدولة بعد." /> : exams.map((item) => <Row key={item.id} title={item.title} detail={`${item.className || item.classId} · ${item.date}`} status={item.examType === 'final' ? 'نهائي' : item.examType === 'midterm' ? 'نصف سنوي' : 'شهري'} onDelete={() => remove('schoolExams', item.id)} />)}</ListCard></div>
  </div>;
}

function FormCard({ title, icon, children }: AnyRecord) { return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white">{icon}{title}</h3><div className="space-y-4">{children}</div></div>; }
function ListCard({ title, children }: AnyRecord) { return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h3 className="mb-4 font-bold text-gray-900 dark:text-white">{title}</h3><div className="space-y-2">{children}</div></div>; }
function Field({ label, children }: AnyRecord) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200"><span className="mb-1 block">{label}</span>{children}</label>; }
function Row({ title, detail, status, onDelete }: AnyRecord) { return <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"><div><p className="font-semibold text-gray-900 dark:text-white">{title}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{status}</span><button type="button" onClick={onDelete} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600">{text}</div>; }
