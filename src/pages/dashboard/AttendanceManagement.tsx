import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ClipboardCheck, Loader2, RefreshCw, Save, Search, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../lib/store';
import { listAttendanceForDate, listSchoolStudents, saveAttendance, type AttendanceStatus, type SchoolStudent } from '../../lib/academicRecords';

const statuses: Array<{ value: AttendanceStatus; labelAr: string; labelEn: string; className: string }> = [
  { value: 'present', labelAr: 'حاضر', labelEn: 'Present', className: 'bg-emerald-600 text-white' },
  { value: 'absent', labelAr: 'غائب', labelEn: 'Absent', className: 'bg-red-600 text-white' },
  { value: 'late', labelAr: 'متأخر', labelEn: 'Late', className: 'bg-amber-500 text-white' },
  { value: 'excused', labelAr: 'بعذر', labelEn: 'Excused', className: 'bg-slate-600 text-white' },
];

function today() { return new Date().toISOString().slice(0, 10); }

export default function AttendanceManagement() {
  const { user, language } = useStore();
  const [date, setDate] = useState(today);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const schoolId = user?.schoolId || '';
  const load = async () => {
    if (!schoolId) { setLoading(false); setError(language === 'ar' ? 'لا توجد مدرسة مرتبطة بهذا الحساب بعد.' : 'This account is not linked to a school yet.'); return; }
    setLoading(true); setError('');
    try {
      const [studentList, records] = await Promise.all([listSchoolStudents(schoolId), listAttendanceForDate(schoolId, date)]);
      setStudents(studentList);
      const next: Record<string, AttendanceStatus> = {};
      const nextNotes: Record<string, string> = {};
      studentList.forEach((student) => { next[student.uid] = 'present'; });
      records.forEach((record) => { next[record.studentId] = record.status; nextNotes[record.studentId] = record.note || ''; });
      setAttendance(next); setNotes(nextNotes);
    } catch (loadError) {
      console.error('Unable to load attendance:', loadError);
      setError(language === 'ar' ? 'تعذر تحميل الطلاب أو حضور اليوم. راجع صلاحيات Firestore.' : 'Unable to load students or today attendance. Check Firestore permissions.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [schoolId, date]);

  const filteredStudents = useMemo(() => students.filter((student) => `${student.name} ${student.studentIdentifier || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [students, search]);
  const counts = useMemo(() => filteredStudents.reduce((acc, student) => { acc[attendance[student.uid] || 'present'] += 1; return acc; }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<AttendanceStatus, number>), [filteredStudents, attendance]);

  const saveAll = async () => {
    if (!schoolId || !filteredStudents.length) return;
    setSaving(true); setError('');
    try {
      await Promise.all(filteredStudents.map((student) => saveAttendance({ schoolId, studentId: student.uid, studentName: student.name, gradeKey: student.gradeKey, classId: student.classId, date, status: attendance[student.uid] || 'present', note: notes[student.uid] || '' })));
      toast.success(language === 'ar' ? `تم حفظ حضور ${filteredStudents.length} طالبًا.` : `Attendance saved for ${filteredStudents.length} students.`);
    } catch (saveError) {
      console.error('Unable to save attendance:', saveError);
      const message = language === 'ar' ? 'تعذر حفظ الحضور. سجّل دخول Firebase بحساب معلم أو مدير.' : 'Unable to save attendance. Use a Firebase teacher or principal session.';
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:flex-row sm:items-end sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Daily operations · Attendance</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{language === 'ar' ? 'الحضور والغياب اليومي' : 'Daily attendance'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{language === 'ar' ? 'سجّل حالة كل طالب واحفظ السجل المدرسي مع وقت التسجيل واسم المسؤول.' : 'Record each student status and keep a school record with the actor and timestamp.'}</p></div><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 p-2"><CalendarDays className="ms-2 h-5 w-5 text-cyan-300" /><input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="rounded-xl bg-transparent px-2 py-2 text-sm font-bold text-white outline-none" /></div></header>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-4">{statuses.map((status) => <div key={status.value} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{language === 'ar' ? status.labelAr : status.labelEn}</span><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${status.className}`}><Check className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{counts[status.value]}</p></div>)}</div>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field ps-10" placeholder={language === 'ar' ? 'ابحث باسم الطالب أو المعرف' : 'Search by student or identifier'} /></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"><RefreshCw className="h-4 w-4" />{language === 'ar' ? 'تحديث' : 'Refresh'}</button><button type="button" onClick={() => void saveAll()} disabled={saving || loading || !filteredStudents.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{language === 'ar' ? 'حفظ الحضور' : 'Save attendance'}</button></div></div></section>
    {loading ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="me-2 h-5 w-5 animate-spin" />{language === 'ar' ? 'جاري تحميل الطلاب...' : 'Loading students...'}</div> : !filteredStudents.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/30"><UserX className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 font-bold text-slate-800 dark:text-white">{language === 'ar' ? 'لا توجد سجلات طلاب مرتبطة' : 'No linked students found'}</p><p className="mt-1 text-sm text-slate-500">{language === 'ar' ? 'اربط الطلاب بالمدرسة أولاً ثم عد إلى هذه الصفحة.' : 'Link students to this school before using attendance.'}</p></div> : <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="hidden grid-cols-[2fr_1fr_2fr_1.5fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 sm:grid"><span>{language === 'ar' ? 'الطالب' : 'Student'}</span><span>{language === 'ar' ? 'الصف' : 'Grade'}</span><span>{language === 'ar' ? 'الحالة' : 'Status'}</span><span>{language === 'ar' ? 'ملاحظة' : 'Note'}</span></div>{filteredStudents.map((student) => <div key={student.uid} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-700 sm:grid-cols-[2fr_1fr_2fr_1.5fr] sm:items-center sm:gap-4 sm:px-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30"><UserCheck className="h-5 w-5" /></span><div><p className="font-bold text-slate-900 dark:text-white">{student.name}</p><p className="text-xs text-slate-400">{student.studentIdentifier || student.uid.slice(0, 8)}</p></div></div><p className="text-sm text-slate-500">{student.gradeKey || '—'}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{statuses.map((status) => <button key={status.value} type="button" onClick={() => setAttendance((current) => ({ ...current, [student.uid]: status.value }))} className={`rounded-lg px-2 py-2 text-xs font-bold transition ${attendance[student.uid] === status.value ? status.className : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}>{language === 'ar' ? status.labelAr : status.labelEn}</button>)}</div><input value={notes[student.uid] || ''} onChange={(event) => setNotes((current) => ({ ...current, [student.uid]: event.target.value }))} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600" placeholder={language === 'ar' ? 'ملاحظة اختيارية' : 'Optional note'} /></div>)}</div>}
  </div>;
}
