import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Loader2, RefreshCw, Save, Search, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../lib/store';
import { listSchoolTeachers, listTeacherAttendanceForDate, saveTeacherAttendance, type AttendanceStatus, type SchoolStudent, type TeacherAttendanceRecord } from '../../lib/academicRecords';

const statuses: Array<{ value: AttendanceStatus; labelAr: string; labelEn: string; className: string }> = [
  { value: 'present', labelAr: 'حاضر', labelEn: 'Present', className: 'bg-emerald-600 text-white' },
  { value: 'absent', labelAr: 'غائب', labelEn: 'Absent', className: 'bg-red-600 text-white' },
  { value: 'late', labelAr: 'متأخر', labelEn: 'Late', className: 'bg-amber-500 text-white' },
  { value: 'excused', labelAr: 'بعذر', labelEn: 'Excused', className: 'bg-slate-600 text-white' },
];

export default function TeacherAttendanceManagement() {
  const { user, language } = useStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teachers, setTeachers] = useState<SchoolStudent[]>([]);
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
      const [teacherList, records] = await Promise.all([listSchoolTeachers(schoolId), listTeacherAttendanceForDate(schoolId, date)]);
      const next: Record<string, AttendanceStatus> = {}; const nextNotes: Record<string, string> = {};
      teacherList.forEach((teacher) => { next[teacher.uid] = 'present'; });
      records.forEach((record: TeacherAttendanceRecord) => { next[record.teacherId] = record.status; nextNotes[record.teacherId] = record.note || ''; });
      setTeachers(teacherList); setAttendance(next); setNotes(nextNotes);
    } catch (loadError) { console.error('Unable to load teacher attendance:', loadError); setError(language === 'ar' ? 'تعذر تحميل حضور المعلمين. راجع الصلاحيات.' : 'Unable to load teacher attendance. Check permissions.'); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [schoolId, date]);
  const filtered = useMemo(() => teachers.filter((teacher) => `${teacher.name} ${teacher.email || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [teachers, search]);
  const saveAll = async () => {
    setSaving(true); setError('');
    try { await Promise.all(filtered.map((teacher) => saveTeacherAttendance({ schoolId, teacherId: teacher.uid, teacherName: teacher.name, date, status: attendance[teacher.uid] || 'present', note: notes[teacher.uid] || '' }))); toast.success(language === 'ar' ? 'تم حفظ حضور المعلمين.' : 'Teacher attendance saved.'); } catch (saveError) { console.error(saveError); const message = language === 'ar' ? 'تعذر حفظ الحضور. استخدم جلسة Firebase حقيقية.' : 'Unable to save attendance. Use a real Firebase session.'; setError(message); toast.error(message); } finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-6"><header className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:flex-row sm:items-end sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Staff operations · Attendance</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{language === 'ar' ? 'حضور المعلمين' : 'Teacher attendance'}</h1><p className="mt-2 text-sm leading-6 text-slate-300">{language === 'ar' ? 'سجّل حضور فريق المدرسة مع ملاحظات قابلة للمراجعة.' : 'Record staff attendance with reviewable notes.'}</p></div><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 p-2"><CalendarDays className="ms-2 h-5 w-5 text-violet-300" /><input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="rounded-xl bg-transparent px-2 py-2 text-sm font-bold text-white outline-none" /></div></header>{error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field ps-10" placeholder={language === 'ar' ? 'ابحث باسم المعلم' : 'Search teacher'} /></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-slate-600 dark:text-slate-100"><RefreshCw className="h-4 w-4" />{language === 'ar' ? 'تحديث' : 'Refresh'}</button><button type="button" onClick={() => void saveAll()} disabled={saving || loading || !filtered.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{language === 'ar' ? 'حفظ' : 'Save'}</button></div></div></section>{loading ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="me-2 h-5 w-5 animate-spin" />{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div> : !filtered.length ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center"><UserX className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 font-bold">{language === 'ar' ? 'لا يوجد معلمون مرتبطون بالمدرسة' : 'No linked teachers found'}</p></div> : <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">{filtered.map((teacher) => <div key={teacher.uid} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-700 sm:grid-cols-[1.3fr_2fr_1fr] sm:items-center"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30"><UserCheck className="h-5 w-5" /></span><div><p className="font-bold">{teacher.name}</p><p className="text-xs text-slate-400">{teacher.email || teacher.uid.slice(0, 8)}</p></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{statuses.map((status) => <button key={status.value} type="button" onClick={() => setAttendance((current) => ({ ...current, [teacher.uid]: status.value }))} className={`rounded-lg px-2 py-2 text-xs font-bold ${attendance[teacher.uid] === status.value ? status.className : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>{language === 'ar' ? status.labelAr : status.labelEn}</button>)}</div><input value={notes[teacher.uid] || ''} onChange={(event) => setNotes((current) => ({ ...current, [teacher.uid]: event.target.value }))} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-600" placeholder={language === 'ar' ? 'ملاحظة اختيارية' : 'Optional note'} /></div>)}</div>}</div>;
}
