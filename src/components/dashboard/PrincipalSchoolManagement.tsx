import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';

interface AnyRecord {
  [key: string]: any;
}

type SchoolTab = 'overview' | 'classes' | 'assignments' | 'settings';

const SUBJECTS = [
  { key: 'arabic', label: 'اللغة العربية' },
  { key: 'mathematics', label: 'الرياضيات' },
  { key: 'science', label: 'العلوم' },
  { key: 'english', label: 'اللغة الإنجليزية' },
  { key: 'social-studies', label: 'الدراسات الاجتماعية' },
  { key: 'islamic-studies', label: 'التربية الإسلامية' },
  { key: 'computer', label: 'الحاسوب' },
  { key: 'physics', label: 'الفيزياء' },
  { key: 'chemistry', label: 'الكيمياء' },
  { key: 'biology', label: 'الأحياء' },
];

const DEFAULT_SETTINGS = {
  periodsPerDay: 7,
  periodDurationMinutes: 45,
  breakDurationMinutes: 20,
  workingDays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
};

const EMPTY_CLASS = { name: '', gradeKey: 'grade_7', section: 'أ', room: '' };
const EMPTY_ASSIGNMENT = { teacherId: '', subjectKey: 'arabic', gradeKey: 'grade_7', classId: '' };

function formatDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ar-YE');
}

function getGradeLabel(gradeKey: string) {
  const item = YEMEN_GRADE_OPTIONS.find((grade: AnyRecord) => grade.key === gradeKey);
  return item?.labelAr || gradeKey;
}

function getSubjectLabel(subjectKey: string) {
  return SUBJECTS.find((subject) => subject.key === subjectKey)?.label || subjectKey;
}

export default function PrincipalSchoolManagement({ schoolId }: { schoolId: string }) {
  const { user, language } = useStore();
  const [tab, setTab] = useState<SchoolTab>('overview');
  const [schoolUsers, setSchoolUsers] = useState<AnyRecord[]>([]);
  const [classes, setClasses] = useState<AnyRecord[]>([]);
  const [assignments, setAssignments] = useState<AnyRecord[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [classForm, setClassForm] = useState(EMPTY_CLASS);
  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [workingDaysText, setWorkingDaysText] = useState(DEFAULT_SETTINGS.workingDays.join('، '));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const teachers = useMemo(
    () => schoolUsers.filter((item) => item.role === 'teacher' && item.status !== 'suspended'),
    [schoolUsers],
  );
  const students = useMemo(() => schoolUsers.filter((item) => item.role === 'student'), [schoolUsers]);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');
    const unsubscribers = [
      onSnapshot(
        query(collection(db, 'users'), where('schoolId', '==', schoolId)),
        (snapshot) => setSchoolUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
        () => setError('تعذر قراءة مستخدمي المدرسة. تأكد من نشر قواعد Firestore.'),
      ),
      onSnapshot(
        query(collection(db, 'schoolClasses'), where('schoolId', '==', schoolId)),
        (snapshot) => setClasses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
        () => setError('تعذر قراءة الصفوف والشعب.'),
      ),
      onSnapshot(
        query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId)),
        (snapshot) => setAssignments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
        () => setError('تعذر قراءة توزيع المعلمين.'),
      ),
      onSnapshot(
        doc(db, 'schoolSettings', schoolId),
        (snapshot) => {
          if (snapshot.exists()) {
            const nextSettings = { ...DEFAULT_SETTINGS, ...snapshot.data() };
            setSettings(nextSettings);
            setSettingsForm(nextSettings);
            setWorkingDaysText((nextSettings.workingDays || []).join('، '));
          }
          setLoading(false);
        },
        () => {
          setError('تعذر قراءة إعدادات المدرسة.');
          setLoading(false);
        },
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [schoolId]);

  const runSave = async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
    } catch (saveError: any) {
      console.error(saveError);
      setError(saveError?.code === 'permission-denied'
        ? 'رفض Firebase العملية. تأكد من أن حسابك مدير للمدرسة وأنك نشرت firestore.rules.'
        : saveError?.message || 'تعذر حفظ التغيير.');
    } finally {
      setSaving(false);
    }
  };

  const addClass = () => runSave(async () => {
    if (!classForm.name.trim()) throw new Error('اكتب اسم الصف أو الشعبة.');
    await addDoc(collection(db, 'schoolClasses'), {
      schoolId,
      name: classForm.name.trim(),
      gradeKey: classForm.gradeKey,
      grade: getGradeLabel(classForm.gradeKey),
      section: classForm.section.trim() || 'أ',
      room: classForm.room.trim(),
      teacherId: '',
      students: [],
      createdBy: user?.uid || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setClassForm(EMPTY_CLASS);
  }, 'تمت إضافة الصف والشعبة.');

  const addAssignment = () => runSave(async () => {
    if (!assignmentForm.teacherId || !assignmentForm.classId) throw new Error('اختر المعلم والصف قبل الحفظ.');
    const selectedClass = classes.find((item) => item.id === assignmentForm.classId);
    if (!selectedClass) throw new Error('الشعبة المختارة غير موجودة.');
    await addDoc(collection(db, 'teacherAssignments'), {
      schoolId,
      teacherId: assignmentForm.teacherId,
      teacherName: teachers.find((item) => item.id === assignmentForm.teacherId)?.name || '',
      subjectKey: assignmentForm.subjectKey,
      subject: getSubjectLabel(assignmentForm.subjectKey),
      gradeKey: assignmentForm.gradeKey,
      classId: assignmentForm.classId,
      className: selectedClass.name,
      section: selectedClass.section || '',
      status: 'active',
      createdBy: user?.uid || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setAssignmentForm({ ...EMPTY_ASSIGNMENT, gradeKey: selectedClass.gradeKey || 'grade_7' });
  }, 'تم تعيين المعلم للمادة والشعبة.');

  const saveSettings = () => runSave(async () => {
    const nextSettings = {
      schoolId,
      periodsPerDay: Number(settingsForm.periodsPerDay),
      periodDurationMinutes: Number(settingsForm.periodDurationMinutes),
      breakDurationMinutes: Number(settingsForm.breakDurationMinutes),
      workingDays: workingDaysText.split(/[،,]/).map((day) => day.trim()).filter(Boolean),
      updatedBy: user?.uid || '',
      updatedAt: new Date().toISOString(),
    };
    if (nextSettings.periodsPerDay < 1 || nextSettings.periodsPerDay > 12) throw new Error('عدد الحصص يجب أن يكون بين 1 و12.');
    if (nextSettings.periodDurationMinutes < 20 || nextSettings.periodDurationMinutes > 180) throw new Error('مدة الحصة يجب أن تكون بين 20 و180 دقيقة.');
    if (nextSettings.breakDurationMinutes < 0 || nextSettings.breakDurationMinutes > 120) throw new Error('مدة الاستراحة غير صحيحة.');
    await setDoc(doc(db, 'schoolSettings', schoolId), nextSettings, { merge: true });
    setSettings(nextSettings);
  }, 'تم حفظ إعدادات اليوم الدراسي.');

  const removeAssignment = (assignment: AnyRecord) => runSave(
    () => deleteDoc(doc(db, 'teacherAssignments', assignment.id)),
    'تم حذف التعيين.',
  );

  const removeClass = (classItem: AnyRecord) => runSave(
    () => deleteDoc(doc(db, 'schoolClasses', classItem.id)),
    'تم حذف الصف.',
  );

  if (!schoolId) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">لم يتم ربط حساب المدير بمدرسة معتمدة بعد.</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center rounded-2xl bg-white py-12 dark:bg-gray-800"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  }

  const tabs = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: CheckCircle2 },
    { id: 'classes' as const, label: 'الصفوف والشعب', icon: UsersRound },
    { id: 'assignments' as const, label: 'توزيع المعلمين', icon: BookOpen },
    { id: 'settings' as const, label: 'إعدادات اليوم', icon: Settings2 },
  ];

  return (
    <div className="space-y-5" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-l from-blue-50 to-white p-5 dark:border-gray-700 dark:from-blue-950/30 dark:to-gray-800">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">إدارة المدرسة</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">الفصول والمعلمون والجدول المدرسي</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">يتحكم المدير في البنية التعليمية داخل المدرسة فقط، بينما تبقى صلاحيات الأدمن خارج هذا النطاق.</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-gray-700">
            <span className="text-gray-500 dark:text-gray-300">رمز المدرسة</span>
            <strong className="ms-2 text-blue-700 dark:text-blue-300">{schoolId}</strong>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">{notice}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<UsersRound className="h-5 w-5" />} label="الطلاب" value={students.length} />
        <Metric icon={<UserRound className="h-5 w-5" />} label="المعلمون" value={teachers.length} />
        <Metric icon={<UsersRound className="h-5 w-5" />} label="الصفوف والشعب" value={classes.length} />
        <Metric icon={<BookOpen className="h-5 w-5" />} label="تعيينات المواد" value={assignments.length} />
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-gray-100 p-2 dark:bg-gray-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-300' : 'text-gray-600 hover:bg-white/70 dark:text-gray-300'}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview classes={classes} assignments={assignments} settings={settings} />}

      {tab === 'classes' && (
        <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <FormCard title="إضافة صف أو شعبة" icon={<Plus className="h-5 w-5" />}>
            <Field label="اسم الصف أو الشعبة">
              <input value={classForm.name} onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} placeholder="مثال: الصف السابع - أ" className={inputClass} />
            </Field>
            <Field label="الصف في منهج اليمن">
              <select value={classForm.gradeKey} onChange={(event) => setClassForm({ ...classForm, gradeKey: event.target.value })} className={inputClass}>
                {YEMEN_GRADE_OPTIONS.map((grade: AnyRecord) => <option key={grade.key} value={grade.key}>{grade.labelAr}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الشعبة"><input value={classForm.section} onChange={(event) => setClassForm({ ...classForm, section: event.target.value })} className={inputClass} /></Field>
              <Field label="الغرفة"><input value={classForm.room} onChange={(event) => setClassForm({ ...classForm, room: event.target.value })} placeholder="اختياري" className={inputClass} /></Field>
            </div>
            <button type="button" disabled={saving} onClick={addClass} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة الصف</button>
          </FormCard>
          <ListCard title="الصفوف المسجلة" icon={<UsersRound className="h-5 w-5" />}>
            {classes.length === 0 ? <Empty text="لم تتم إضافة صفوف بعد." /> : <div className="grid gap-3 sm:grid-cols-2">{classes.map((item) => <div key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-gray-900 dark:text-white">{item.name}</p><p className="mt-1 text-xs text-gray-500">{item.grade || getGradeLabel(item.gradeKey)} · شعبة {item.section || '—'}{item.room ? ` · غرفة ${item.room}` : ''}</p></div><button type="button" aria-label="حذف الصف" onClick={() => removeClass(item)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div><p className="mt-3 text-xs text-gray-500">أُنشئ في {formatDate(item.createdAt)}</p></div>)}</div>}
          </ListCard>
        </section>
      )}

      {tab === 'assignments' && (
        <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <FormCard title="تعيين معلم لمادة" icon={<BookOpen className="h-5 w-5" />}>
            <p className="mb-3 text-xs text-gray-500">يمكن إضافة معلم ثانٍ للمادة نفسها بإضافة تعيين جديد للمادة والشعبة ذاتها.</p>
            <Field label="المعلم">
              <select value={assignmentForm.teacherId} onChange={(event) => setAssignmentForm({ ...assignmentForm, teacherId: event.target.value })} className={inputClass}><option value="">اختر معلماً</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.email}</option>)}</select>
            </Field>
            <Field label="المادة"><select value={assignmentForm.subjectKey} onChange={(event) => setAssignmentForm({ ...assignmentForm, subjectKey: event.target.value })} className={inputClass}>{SUBJECTS.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}</select></Field>
            <Field label="الصف الدراسي"><select value={assignmentForm.gradeKey} onChange={(event) => setAssignmentForm({ ...assignmentForm, gradeKey: event.target.value })} className={inputClass}>{YEMEN_GRADE_OPTIONS.map((grade: AnyRecord) => <option key={grade.key} value={grade.key}>{grade.labelAr}</option>)}</select></Field>
            <Field label="الشعبة"><select value={assignmentForm.classId} onChange={(event) => setAssignmentForm({ ...assignmentForm, classId: event.target.value })} className={inputClass}><option value="">اختر الصف والشعبة</option>{classes.filter((item) => !assignmentForm.gradeKey || item.gradeKey === assignmentForm.gradeKey).map((item) => <option key={item.id} value={item.id}>{item.name} · شعبة {item.section || '—'}</option>)}</select></Field>
            <button type="button" disabled={saving || teachers.length === 0 || classes.length === 0} onClick={addAssignment} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ التعيين</button>
          </FormCard>
          <ListCard title="التوزيع الحالي" icon={<UserRound className="h-5 w-5" />}>
            {assignments.length === 0 ? <Empty text="لم تتم إضافة تعيينات بعد." /> : <div className="space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700"><div><p className="font-semibold text-gray-900 dark:text-white">{assignment.teacherName || teachers.find((teacher) => teacher.id === assignment.teacherId)?.name || 'معلم غير معروف'}</p><p className="mt-1 text-sm text-blue-700 dark:text-blue-300">{assignment.subject || getSubjectLabel(assignment.subjectKey)}</p><p className="mt-1 text-xs text-gray-500">{assignment.className || classes.find((item) => item.id === assignment.classId)?.name || 'صف غير معروف'} · {getGradeLabel(assignment.gradeKey)}</p></div><button type="button" aria-label="حذف التعيين" onClick={() => removeAssignment(assignment)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
          </ListCard>
        </section>
      )}

      {tab === 'settings' && (
        <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <FormCard title="إعدادات اليوم الدراسي" icon={<CalendarClock className="h-5 w-5" />}>
            <Field label="عدد الحصص اليومية"><input type="number" min="1" max="12" value={settingsForm.periodsPerDay} onChange={(event) => setSettingsForm({ ...settingsForm, periodsPerDay: Number(event.target.value) })} className={inputClass} /></Field>
            <Field label="مدة الحصة بالدقائق"><input type="number" min="20" max="180" value={settingsForm.periodDurationMinutes} onChange={(event) => setSettingsForm({ ...settingsForm, periodDurationMinutes: Number(event.target.value) })} className={inputClass} /></Field>
            <Field label="مدة الاستراحة بالدقائق"><input type="number" min="0" max="120" value={settingsForm.breakDurationMinutes} onChange={(event) => setSettingsForm({ ...settingsForm, breakDurationMinutes: Number(event.target.value) })} className={inputClass} /></Field>
            <Field label="أيام الدوام، مفصولة بفاصلة"><input value={workingDaysText} onChange={(event) => setWorkingDaysText(event.target.value)} className={inputClass} /></Field>
            <button type="button" disabled={saving} onClick={saveSettings} className={primaryButton}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الإعدادات</button>
          </FormCard>
          <ListCard title="المعاينة الحالية" icon={<Clock3 className="h-5 w-5" />}>
            <div className="grid gap-3 sm:grid-cols-2"><SummaryRow label="الحصص اليومية" value={`${settings.periodsPerDay} حصص`} /><SummaryRow label="مدة الحصة" value={`${settings.periodDurationMinutes} دقيقة`} /><SummaryRow label="الاستراحة" value={`${settings.breakDurationMinutes} دقيقة`} /><SummaryRow label="أيام الدوام" value={(settings.workingDays || []).join('، ') || '—'} /></div>
          </ListCard>
        </section>
      )}
    </div>
  );
}

function Overview({ classes, assignments, settings }: AnyRecord) {
  const uncoveredClasses = classes.filter((item: AnyRecord) => !assignments.some((assignment: AnyRecord) => assignment.classId === item.id));
  return <section className="grid gap-5 lg:grid-cols-2"><ListCard title="جاهزية التشغيل" icon={<CheckCircle2 className="h-5 w-5" />}><div className="space-y-3"><SummaryRow label="إعدادات اليوم الدراسي" value={settings?.periodsPerDay ? 'مكتملة' : 'غير مكتملة'} good={Boolean(settings?.periodsPerDay)} /><SummaryRow label="الصفوف التي لا تملك تعييناً" value={`${uncoveredClasses.length} صف`} good={uncoveredClasses.length === 0} /><SummaryRow label="عدد أيام الدوام" value={`${settings?.workingDays?.length || 0} أيام`} good={Boolean(settings?.workingDays?.length)} /></div></ListCard><ListCard title="ملاحظات الإدارة" icon={<Settings2 className="h-5 w-5" />}><ul className="space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300"><li>أضف صفوف المدرسة أولاً، ثم وزّع المواد على المعلمين.</li><li>لإسناد مادة إلى معلمين اثنين، أنشئ تعيينين مستقلين للمادة والشعبة نفسها.</li><li>إنشاء معرفات الطلاب وربطهم بأولياء الأمور يتم من مركز الأدمن، وليس من تسجيل الطالب.</li></ul></ListCard></section>;
}

function Metric({ icon, label, value }: AnyRecord) { return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{icon}</div><div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div></div></div>; }
function FormCard({ title, icon, children }: AnyRecord) { return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white">{icon}{title}</h3><div className="space-y-4">{children}</div></div>; }
function ListCard({ title, icon, children }: AnyRecord) { return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white">{icon}{title}</h3>{children}</div>; }
function Field({ label, children }: AnyRecord) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200"><span className="mb-1 block">{label}</span>{children}</label>; }
function SummaryRow({ label, value, good = true }: AnyRecord) { return <div className="flex items-start justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-700/50"><span className="text-gray-500 dark:text-gray-300">{label}</span><span className={good ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-amber-700 dark:text-amber-300'}>{value}</span></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600">{text}</div>; }

const inputClass = 'mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
const primaryButton = 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
