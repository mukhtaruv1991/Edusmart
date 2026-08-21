import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Activity, BadgeCheck, BookOpen, CalendarDays, Check, ChevronDown, Database, GraduationCap, Loader2, Plus, School, Settings2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { createStableKey, isFourPartName, normalizePersonName } from '../../lib/utils';
import { YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';
import CurriculumManager from '../../components/dashboard/CurriculumManager';

type Tab = 'schools' | 'principals' | 'ids' | 'curriculum' | 'calendar' | 'settings' | 'demo';
type AnyRecord = Record<string, any>;

const today = new Date().toISOString().slice(0, 10);
const inputClass = 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white';

export default function AdminControlCenter() {
  const { language, user } = useStore();
  const [tab, setTab] = useState<Tab>('schools');
  const [schools, setSchools] = useState<AnyRecord[]>([]);
  const [invitations, setInvitations] = useState<AnyRecord[]>([]);
  const [studentIds, setStudentIds] = useState<AnyRecord[]>([]);
  const [calendar, setCalendar] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [schoolForm, setSchoolForm] = useState({ name: '', governorate: 'أمانة العاصمة', district: '', system: 'حكومي', principalName: '', principalEmail: '' });
  const [principalForm, setPrincipalForm] = useState({ name: '', email: '', phoneNumber: '', schoolId: '', role: 'principal' });
  const [idForm, setIdForm] = useState({ identifier: '', studentName: '', gradeKey: 'grade_7', classId: '', schoolId: '' });
  const [calendarForm, setCalendarForm] = useState({ title: '', date: today, type: 'holiday', description: '', scope: 'national' });
  const [settingsForm, setSettingsForm] = useState({ schoolId: '', periodsPerDay: '7', periodDurationMinutes: '45', breakDurationMinutes: '20', workingDays: 'الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس' });

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(collection(db, 'schools'), (snapshot) => setSchools(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), (e) => setError(errorMessage(e, language))),
      onSnapshot(collection(db, 'adminInvitations'), (snapshot) => setInvitations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), (e) => setError(errorMessage(e, language))),
      onSnapshot(collection(db, 'studentIds'), (snapshot) => setStudentIds(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), (e) => setError(errorMessage(e, language))),
      onSnapshot(collection(db, 'academicCalendar'), (snapshot) => setCalendar(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), (e) => setError(errorMessage(e, language))),
    ];
    setLoading(false);
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [language]);

  const orderedSchools = useMemo(() => [...schools].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar')), [schools]);
  const pendingInvitations = useMemo(() => invitations.filter((item) => item.status !== 'approved'), [invitations]);

  const runAction = async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    setError('');
    try {
      await action();
      toast.success(success);
    } catch (e) {
      const message = errorMessage(e, language);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const createSchool = () => runAction(async () => {
    if (!schoolForm.name.trim() || !schoolForm.district.trim()) throw new Error('بيانات المدرسة ناقصة');
    const schoolRef = doc(collection(db, 'schools'));
    const school = { id: schoolRef.id, name: schoolForm.name.trim(), country: 'اليمن', city: schoolForm.governorate, district: schoolForm.district.trim(), governorate: schoolForm.governorate, system: schoolForm.system, status: 'active', approvalStatus: 'approved', isActive: true, createdBy: auth.currentUser?.uid || user?.uid || '', createdAt: new Date().toISOString() };
    await setDoc(schoolRef, school);
    if (schoolForm.principalName.trim() && schoolForm.principalEmail.trim()) {
      const invitation = { name: schoolForm.principalName.trim(), email: schoolForm.principalEmail.trim().toLowerCase(), role: 'principal', schoolId: schoolRef.id, status: 'pending', createdBy: auth.currentUser?.uid || user?.uid || '', createdAt: new Date().toISOString() };
      const invitationRef = await addDoc(collection(db, 'adminInvitations'), invitation);
      await setDoc(doc(db, 'roleInvitationsByEmail', invitation.email), { ...invitation, invitationId: invitationRef.id, emailKey: invitation.email });
    }
    await writeAudit('create', 'schools', schoolRef.id, null, school);
    setSchoolForm({ name: '', governorate: 'أمانة العاصمة', district: '', system: 'حكومي', principalName: '', principalEmail: '' });
  }, 'تمت إضافة المدرسة بنجاح');

  const updateSchoolStatus = (school: AnyRecord, status: 'active' | 'rejected') => runAction(async () => {
    const update = { status, approvalStatus: status === 'active' ? 'approved' : 'rejected', isActive: status === 'active', reviewedBy: auth.currentUser?.uid || user?.uid || '', reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'schools', school.id), update, { merge: true });
    await writeAudit(status === 'active' ? 'approve' : 'reject', 'schools', school.id, school, { ...school, ...update });
  }, status === 'active' ? 'تم اعتماد المدرسة' : 'تم رفض المدرسة');

  const updateInvitationStatus = (invitation: AnyRecord, status: 'approved' | 'rejected') => runAction(async () => {
    const update = { status, reviewedBy: auth.currentUser?.uid || user?.uid || '', reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'adminInvitations', invitation.id), update, { merge: true });
    if (invitation.email) await setDoc(doc(db, 'roleInvitationsByEmail', String(invitation.email).trim().toLowerCase()), update, { merge: true });
    await writeAudit(status === 'approved' ? 'approve' : 'reject', 'adminInvitations', invitation.id, invitation, { ...invitation, ...update });
  }, status === 'approved' ? 'تم اعتماد الطلب' : 'تم رفض الطلب');

  const createPrincipalInvitation = () => runAction(async () => {
    if (!principalForm.name.trim() || !principalForm.email.trim() || !principalForm.schoolId) throw new Error('أكمل بيانات المدير والمدرسة');
    const invitation = { ...principalForm, name: principalForm.name.trim(), email: principalForm.email.trim().toLowerCase(), status: 'pending', createdBy: auth.currentUser?.uid || user?.uid || '', createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, 'adminInvitations'), invitation);
    await setDoc(doc(db, 'roleInvitationsByEmail', invitation.email), { ...invitation, invitationId: ref.id, emailKey: invitation.email });
    await writeAudit('create', 'adminInvitations', ref.id, null, invitation);
    setPrincipalForm({ name: '', email: '', phoneNumber: '', schoolId: '', role: 'principal' });
  }, 'تم حفظ طلب اعتماد المدير');

  const createStudentId = () => runAction(async () => {
    const identifier = idForm.identifier.trim().toUpperCase();
    const studentName = normalizePersonName(idForm.studentName);
    if (identifier.length < 6 || !studentName || !idForm.schoolId) throw new Error('أكمل معرف الطالب والاسم والمدرسة');
    if (!isFourPartName(studentName)) throw new Error('يجب أن يكون اسم الطالب رباعياً');
    const record = { identifier, studentName, nameKey: createStableKey(studentName), schoolId: idForm.schoolId, gradeKey: idForm.gradeKey, classId: idForm.classId.trim(), status: 'available', createdBy: auth.currentUser?.uid || user?.uid || '', createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'studentIds', identifier), record);
    await writeAudit('create', 'studentIds', identifier, null, record);
    setIdForm({ identifier: '', studentName: '', gradeKey: 'grade_7', classId: '', schoolId: idForm.schoolId });
  }, 'تم إنشاء معرف الطالب');

  const createCalendarEntry = () => runAction(async () => {
    if (!calendarForm.title.trim() || !calendarForm.date) throw new Error('أكمل عنوان وتاريخ المناسبة');
    const entry = { ...calendarForm, title: calendarForm.title.trim(), createdBy: auth.currentUser?.uid || user?.uid || '', createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, 'academicCalendar'), entry);
    await writeAudit('create', 'academicCalendar', ref.id, null, entry);
    setCalendarForm({ title: '', date: today, type: 'holiday', description: '', scope: 'national' });
  }, 'تمت إضافة المناسبة إلى التقويم');

  const saveSchoolSettings = () => runAction(async () => {
    if (!settingsForm.schoolId) throw new Error('اختر المدرسة أولاً');
    const settings = { schoolId: settingsForm.schoolId, periodsPerDay: Number(settingsForm.periodsPerDay), periodDurationMinutes: Number(settingsForm.periodDurationMinutes), breakDurationMinutes: Number(settingsForm.breakDurationMinutes), workingDays: settingsForm.workingDays.split('،').map((day) => day.trim()).filter(Boolean), updatedBy: auth.currentUser?.uid || user?.uid || '', updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'schoolSettings', settingsForm.schoolId), settings, { merge: true });
    await writeAudit('update', 'schoolSettings', settingsForm.schoolId, null, settings);
  }, 'تم حفظ إعدادات الدوام والحصص');

  const seedDemo = () => runAction(async () => {
    const actorId = auth.currentUser?.uid || user?.uid || '';
    const now = new Date().toISOString();
    const schoolRef = doc(collection(db, 'schools'));
    const school = { id: schoolRef.id, name: 'مدرسة EduSmart التجريبية', country: 'اليمن', city: 'أمانة العاصمة', district: 'معين', governorate: 'أمانة العاصمة', system: 'حكومي', status: 'active', approvalStatus: 'approved', isActive: true, isDemo: true, createdBy: actorId, createdAt: now };
    await setDoc(schoolRef, school);
    await setDoc(doc(db, 'schoolSettings', schoolRef.id), { schoolId: schoolRef.id, periodsPerDay: 7, periodDurationMinutes: 45, breakDurationMinutes: 20, workingDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'], isDemo: true, updatedBy: actorId, updatedAt: now });

    const classRecords = [{ name: 'الصف السابع - أ', gradeKey: 'grade_7', section: 'أ' }, { name: 'الصف الثامن - أ', gradeKey: 'grade_8', section: 'أ' }];
    const classRefs = classRecords.map(() => doc(collection(db, 'schoolClasses')));
    await Promise.all(classRecords.map((item, index) => setDoc(classRefs[index], { ...item, schoolId: schoolRef.id, studentCount: index === 0 ? 2 : 1, createdBy: actorId, createdAt: now })));

    const demoStudents = [
      { identifier: 'YEM-TEST-7001', studentName: 'أحمد محمد علي القحطاني', gradeKey: 'grade_7', classId: classRefs[0].id },
      { identifier: 'YEM-TEST-7002', studentName: 'سارة عبدالله صالح الحكيمي', gradeKey: 'grade_7', classId: classRefs[0].id },
      { identifier: 'YEM-TEST-8001', studentName: 'خالد يحيى حسن الزبيري', gradeKey: 'grade_8', classId: classRefs[1].id },
    ];
    await Promise.all(demoStudents.map((item) => setDoc(doc(db, 'studentIds', item.identifier), { ...item, nameKey: createStableKey(item.studentName), schoolId: schoolRef.id, status: 'available', isDemo: true, createdBy: actorId, createdAt: now })));

    await addDoc(collection(db, 'teacherAssignments'), { schoolId: schoolRef.id, teacherId: 'demo-teacher', teacherName: 'معلم الرياضيات التجريبي', subjectKey: 'mathematics', subject: 'الرياضيات', gradeKey: 'grade_7', classId: classRefs[0].id, className: classRecords[0].name, status: 'active', isDemo: true, createdBy: actorId, createdAt: now });
    await addDoc(collection(db, 'contentOverrides'), { schoolId: schoolRef.id, gradeKey: 'grade_7', subjectKey: 'mathematics', lessonKey: 'demo-fractions', lessonTitle: 'الكسور الاعتيادية', status: 'required', isDemo: true, decidedBy: actorId, decidedAt: now });
    await addDoc(collection(db, 'schoolExams'), { schoolId: schoolRef.id, title: 'اختبار الشهر الأول - رياضيات', classId: classRefs[0].id, className: classRecords[0].name, gradeKey: 'grade_7', examType: 'monthly', date: today, durationMinutes: 45, notes: 'موعد تجريبي قابل للتعديل من المدير', status: 'scheduled', teacherId: '', isDemo: true, createdBy: actorId, createdAt: now, updatedAt: now });

    const demoPrincipalInvitation = { name: 'مدير المدرسة التجريبية', email: 'principal.demo@edusmart.local', role: 'principal', schoolId: schoolRef.id, status: 'approved', isDemo: true, createdBy: actorId, createdAt: now };
    const demoTeacherInvitation = { name: 'معلم الرياضيات التجريبي', email: 'teacher.demo@edusmart.local', role: 'teacher', schoolId: schoolRef.id, subjectKey: 'mathematics', status: 'approved', isDemo: true, createdBy: actorId, createdAt: now };
    const [principalRef, teacherRef] = await Promise.all([addDoc(collection(db, 'adminInvitations'), demoPrincipalInvitation), addDoc(collection(db, 'adminInvitations'), demoTeacherInvitation)]);
    await Promise.all([setDoc(doc(db, 'roleInvitationsByEmail', demoPrincipalInvitation.email), { ...demoPrincipalInvitation, invitationId: principalRef.id, emailKey: demoPrincipalInvitation.email }), setDoc(doc(db, 'roleInvitationsByEmail', demoTeacherInvitation.email), { ...demoTeacherInvitation, invitationId: teacherRef.id, emailKey: demoTeacherInvitation.email })]);
    await addDoc(collection(db, 'academicCalendar'), { title: 'بداية العام الدراسي التجريبي', date: today, type: 'academic-year-start', description: 'بيان تجريبي قابل للتعديل من الإدارة', scope: 'national', isDemo: true, createdBy: actorId, createdAt: now });
    await writeAudit('seed', 'demo', schoolRef.id, null, { schoolId: schoolRef.id, schoolName: school.name, records: 'school, settings, classes, student IDs, assignments, content, exam, invitations, calendar' });
  }, 'تم إنشاء حزمة البيانات التجريبية');

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const tabs: { id: Tab; label: string; icon: typeof School }[] = [
    { id: 'schools', label: 'المدارس', icon: School },
    { id: 'principals', label: 'المديرون والصلاحيات', icon: ShieldCheck },
    { id: 'ids', label: 'معرفات الطلاب', icon: GraduationCap },
    { id: 'curriculum', label: 'المناهج', icon: BookOpen },
    { id: 'calendar', label: 'التقويم والعطل', icon: CalendarDays },
    { id: 'settings', label: 'إعدادات المدارس', icon: Settings2 },
    { id: 'demo', label: 'بيانات تجريبية', icon: Database },
  ];

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold text-blue-600">الإدارة العليا</p><h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">مركز التحكم والصلاحيات</h1><p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">من هنا تتحكم الإدارة في المدارس والمديرين ومعرفات الطلاب والتقويم والإعدادات العامة، مع تسجيل كل إجراء في سجل التدقيق.</p></div><div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"><Activity className="h-4 w-4" /> متصل بقاعدة `(default)`</div></header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary icon={<School className="h-5 w-5" />} label="المدارس" value={schools.length} /><Summary icon={<Users className="h-5 w-5" />} label="طلبات الصلاحيات" value={pendingInvitations.length} /><Summary icon={<GraduationCap className="h-5 w-5" />} label="معرفات الطلاب" value={studentIds.length} /><Summary icon={<CalendarDays className="h-5 w-5" />} label="عناصر التقويم" value={calendar.length} /></div>
    <div className="flex gap-2 overflow-x-auto rounded-2xl bg-gray-100 p-2 dark:bg-gray-800">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-300' : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-700/70'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">{tab === 'schools' && <SchoolsTab form={schoolForm} setForm={setSchoolForm} onSubmit={createSchool} onStatusChange={updateSchoolStatus} saving={saving} schools={orderedSchools} />}{tab === 'principals' && <PrincipalsTab form={principalForm} setForm={setPrincipalForm} onSubmit={createPrincipalInvitation} onStatusChange={updateInvitationStatus} saving={saving} schools={orderedSchools} invitations={invitations} />}{tab === 'ids' && <StudentIdsTab form={idForm} setForm={setIdForm} onSubmit={createStudentId} saving={saving} schools={orderedSchools} ids={studentIds} />}{tab === 'curriculum' && <CurriculumManager />}{tab === 'calendar' && <CalendarTab form={calendarForm} setForm={setCalendarForm} onSubmit={createCalendarEntry} saving={saving} entries={calendar} />}{tab === 'settings' && <SettingsTab form={settingsForm} setForm={setSettingsForm} onSubmit={saveSchoolSettings} saving={saving} schools={orderedSchools} />}{tab === 'demo' && <DemoTab onSeed={seedDemo} saving={saving} />}</section>
  </div>;
}

function SchoolsTab({ form, setForm, onSubmit, onStatusChange, saving, schools }: AnyRecord) {
  return <div className="space-y-5">
    <SectionTitle icon={<School className="h-5 w-5" />} title="إضافة واعتماد المدارس" description="يتحكم الأدمن في إضافة المدارس ومراجعة الطلبات وتفعيلها أو رفضها." />
    <div className="grid gap-4 md:grid-cols-2"><Input label="اسم المدرسة" value={form.name} onChange={(value: string) => setForm({ ...form, name: value })} /><Input label="المديرية" value={form.district} onChange={(value: string) => setForm({ ...form, district: value })} /><Input label="المحافظة" value={form.governorate} onChange={(value: string) => setForm({ ...form, governorate: value })} /><Input label="النظام" value={form.system} onChange={(value: string) => setForm({ ...form, system: value })} /><Input label="اسم المدير (اختياري)" value={form.principalName} onChange={(value: string) => setForm({ ...form, principalName: value })} /><Input label="بريد المدير (اختياري)" type="email" value={form.principalEmail} onChange={(value: string) => setForm({ ...form, principalEmail: value })} /></div>
    <SubmitButton onClick={onSubmit} saving={saving} label="إضافة المدرسة" />
    <List title="المدارس المسجلة وطلبات الاعتماد" items={schools} empty="لا توجد مدارس بعد" render={(item: AnyRecord) => <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-gray-500">{[item.city || item.governorate, item.district, item.system].filter(Boolean).join(' • ')} — {item.status === 'active' ? 'نشطة' : item.status === 'pending' ? 'قيد الاعتماد' : item.status === 'rejected' ? 'مرفوضة' : item.status}</p></div>{item.status !== 'active' && <div className="flex gap-2"><button type="button" onClick={() => onStatusChange(item, 'active')} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">اعتماد</button><button type="button" onClick={() => onStatusChange(item, 'rejected')} disabled={saving} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">رفض</button></div>}</div>} />
  </div>;
}

function PrincipalsTab({ form, setForm, onSubmit, onStatusChange, saving, schools, invitations }: AnyRecord) {
  return <div className="space-y-5">
    <SectionTitle icon={<ShieldCheck className="h-5 w-5" />} title="إضافة المديرين واعتماد الصلاحيات" description="يحدد الأدمن مدير المدرسة ويربطه بمدرسته، ثم يعتمد أو يرفض طلب الصلاحية." />
    <div className="grid gap-4 md:grid-cols-2"><Input label="اسم المدير أو المعلم" value={form.name} onChange={(value: string) => setForm({ ...form, name: value })} /><Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(value: string) => setForm({ ...form, email: value })} /><Input label="رقم الهاتف" value={form.phoneNumber} onChange={(value: string) => setForm({ ...form, phoneNumber: value })} /><Select label="الدور" value={form.role} onChange={(value: string) => setForm({ ...form, role: value })} options={[{ id: 'principal', name: 'مدير مدرسة' }, { id: 'teacher', name: 'معلم' }]} /><Select label="المدرسة" value={form.schoolId} onChange={(value: string) => setForm({ ...form, schoolId: value })} options={schools} placeholder="اختر المدرسة" /></div>
    <SubmitButton onClick={onSubmit} saving={saving} label="حفظ طلب المدير" />
    <List title="طلبات المديرين والمعلمين" items={invitations} empty="لا توجد طلبات" render={(item: AnyRecord) => <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.name} <span className="text-xs font-normal text-blue-600">{item.role}</span></p><p className="text-xs text-gray-500">{item.email} — {item.status === 'approved' ? 'معتمد' : item.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</p></div>{item.status !== 'approved' && <div className="flex gap-2"><button type="button" onClick={() => onStatusChange(item, 'approved')} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">اعتماد</button><button type="button" onClick={() => onStatusChange(item, 'rejected')} disabled={saving} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">رفض</button></div>}</div>} />
  </div>;
}

function StudentIdsTab({ form, setForm, onSubmit, saving, schools, ids }: AnyRecord) {
  return <div className="space-y-5">
    <SectionTitle icon={<GraduationCap className="h-5 w-5" />} title="إنشاء معرف طالب" description="يُصدر الأدمن معرفاً فريداً باسم رباعي وصف وشعبة محددة. عند التسجيل يكتبه الطالب فيُربط تلقائياً بالمدرسة والمنهج." />
    <div className="grid gap-4 md:grid-cols-2"><Input label="المعرف الفريد" value={form.identifier} onChange={(value: string) => setForm({ ...form, identifier: value })} placeholder="YEM-2026-0001" /><Input label="اسم الطالب الرباعي" value={form.studentName} onChange={(value: string) => setForm({ ...form, studentName: value })} /><Select label="المدرسة" value={form.schoolId} onChange={(value: string) => setForm({ ...form, schoolId: value })} options={schools} placeholder="اختر المدرسة" /><Select label="الصف والمنهج" value={form.gradeKey} onChange={(value: string) => setForm({ ...form, gradeKey: value })} options={YEMEN_GRADE_OPTIONS.map((option) => ({ id: option.key, name: option.labelAr }))} placeholder="اختر الصف" /><Input label="معرف الشعبة (اختياري)" value={form.classId} onChange={(value: string) => setForm({ ...form, classId: value })} /></div>
    <SubmitButton onClick={onSubmit} saving={saving} label="إنشاء المعرف" />
    <List title="المعرفات المنشأة" items={ids} empty="لم يتم إنشاء معرفات" render={(item: AnyRecord) => <div><p className="font-semibold tracking-wide">{item.identifier} <span className="text-xs font-normal text-emerald-600">{item.status === 'assigned' ? 'مرتبط' : 'متاح'}</span></p><p className="text-xs text-gray-500">{item.studentName} — {item.gradeKey}</p></div>} />
  </div>;
}

function CalendarTab({ form, setForm, onSubmit, saving, entries }: AnyRecord) { return <div className="space-y-5"><SectionTitle icon={<CalendarDays className="h-5 w-5" />} title="التقويم الدراسي والعطل الرسمية" description="أدخل التقويم العام للجمهورية أو فعالية خاصة بمدرسة. يمكن تعديل النموذج لاحقاً لإضافة مصدر رسمي معتمد." /><div className="grid gap-4 md:grid-cols-2"><Input label="العنوان" value={form.title} onChange={(value: string) => setForm({ ...form, title: value })} /><Input label="التاريخ" type="date" value={form.date} onChange={(value: string) => setForm({ ...form, date: value })} /><Select label="النوع" value={form.type} onChange={(value: string) => setForm({ ...form, type: value })} options={[{ id: 'holiday', name: 'عطلة رسمية' }, { id: 'exam', name: 'اختبار مركزي' }, { id: 'academic-year-start', name: 'بداية العام' }, { id: 'academic-year-end', name: 'نهاية العام' }]} /><Select label="النطاق" value={form.scope} onChange={(value: string) => setForm({ ...form, scope: value })} options={[{ id: 'national', name: 'جمهوري' }, { id: 'school', name: 'مدرسي' }]} /></div><Input label="الوصف" value={form.description} onChange={(value: string) => setForm({ ...form, description: value })} /><SubmitButton onClick={onSubmit} saving={saving} label="إضافة إلى التقويم" /><List title="آخر عناصر التقويم" items={[...entries].sort((a: AnyRecord, b: AnyRecord) => String(b.date).localeCompare(String(a.date))).slice(0, 12)} empty="التقويم فارغ" render={(item: AnyRecord) => <div><p className="font-semibold">{item.title}</p><p className="text-xs text-gray-500">{item.date} — {item.scope === 'national' ? 'جمهوري' : 'مدرسي'}</p></div>} /></div>; }

function SettingsTab({ form, setForm, onSubmit, saving, schools }: AnyRecord) { return <div className="space-y-5"><SectionTitle icon={<Settings2 className="h-5 w-5" />} title="إعدادات الدوام والحصص" description="تحكم في عدد الحصص اليومية ومدة الحصة وفترة الراحة وأيام العمل لكل مدرسة." /><div className="grid gap-4 md:grid-cols-2"><Select label="المدرسة" value={form.schoolId} onChange={(value: string) => setForm({ ...form, schoolId: value })} options={schools} placeholder="اختر المدرسة" /><Input label="عدد الحصص في اليوم" type="number" value={form.periodsPerDay} onChange={(value: string) => setForm({ ...form, periodsPerDay: value })} /><Input label="مدة الحصة بالدقائق" type="number" value={form.periodDurationMinutes} onChange={(value: string) => setForm({ ...form, periodDurationMinutes: value })} /><Input label="مدة الراحة بالدقائق" type="number" value={form.breakDurationMinutes} onChange={(value: string) => setForm({ ...form, breakDurationMinutes: value })} /><div className="md:col-span-2"><Input label="أيام العمل، مفصولة بعلامة (،)" value={form.workingDays} onChange={(value: string) => setForm({ ...form, workingDays: value })} /></div></div><SubmitButton onClick={onSubmit} saving={saving} label="حفظ الإعدادات" /></div>; }

function DemoTab({ onSeed, saving }: AnyRecord) { return <div className="max-w-2xl space-y-5"><SectionTitle icon={<Database className="h-5 w-5" />} title="إنشاء بيانات تجريبية مترابطة" description="ينشئ هذا الزر مدرسة تجريبية، إعدادات دوام، صفين، ثلاثة معرفات طلاب، طلب مدير، طلب معلم، وعنصراً في التقويم. السجلات موسومة isDemo ويمكن حذفها لاحقاً من أدوات الإدارة." /><div className="rounded-2xl bg-blue-50 p-5 text-sm leading-7 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100"><p className="font-semibold">ما سيتم إنشاؤه:</p><p>مدرسة EduSmart التجريبية في مديرية معين، الصف السابع والثامن، معرفات الطلاب `YEM-TEST-7001` و`YEM-TEST-7002` و`YEM-TEST-8001`، ومدير ومعلم تجريبيان، وإعدادات سبع حصص يومياً.</p></div><SubmitButton onClick={onSeed} saving={saving} label="إنشاء الحزمة التجريبية" /></div>; }

function SectionTitle({ icon, title, description }: AnyRecord) { return <div className="flex gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{icon}</div><div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p></div></div>; }
function Input({ label, value, onChange, type = 'text', placeholder = '' }: AnyRecord) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}<input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>; }
function Select({ label, value, onChange, options, placeholder }: AnyRecord) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}<span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} appearance-none`}>{placeholder && <option value="">{placeholder}</option>}{options.map((option: AnyRecord) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-3 h-4 w-4 text-gray-400" /></span></label>; }
function SubmitButton({ onClick, saving, label }: AnyRecord) { return <button type="button" onClick={onClick} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{label}</button>; }
function List({ title, items, empty, render }: AnyRecord) { return <div className="border-t border-gray-100 pt-5 dark:border-gray-700"><h3 className="mb-3 font-semibold text-gray-900 dark:text-white">{title}</h3>{items.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-700/40">{empty}</p> : <div className="grid gap-2 md:grid-cols-2">{items.map((item: AnyRecord) => <div key={item.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">{render(item)}</div>)}</div>}</div>; }
function Summary({ icon, label, value }: AnyRecord) { return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{icon}</div><div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div></div></div>; }

async function writeAudit(action: string, collectionName: string, entityId: string, before: AnyRecord | null, after: AnyRecord | null) {
  const actorId = auth.currentUser?.uid || '';
  if (!actorId) return;
  await addDoc(collection(db, 'auditLogs'), { action, collection: collectionName, entityId, before, after, actorId, createdAt: new Date().toISOString() });
}

function errorMessage(error: unknown, language: 'ar' | 'en') {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  if (code === 'permission-denied') return language === 'ar' ? 'ليس لديك صلاحية لهذا الإجراء. يجب أن يكون الحساب Admin.' : 'You do not have permission. An Admin account is required.';
  return error instanceof Error ? error.message : (language === 'ar' ? 'تعذر تنفيذ العملية. تحقق من الاتصال وقواعد Firestore.' : 'Operation failed. Check the connection and Firestore rules.');
}
