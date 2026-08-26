/*
 * EduSmart design reminder: keep the academic workspace calm and operational—
 * clear RTL hierarchy, compact status surfaces, and no decorative UI that hides
 * the source of truth. All timetable entries are school-scoped Firestore data.
 */
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { CalendarClock, Clock3, Plus, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { getGradeLabelAr } from '../../lib/gradeCatalog';

interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  dayOfWeek: number;
  periodNumber: number;
  subjectKey: string;
  teacherIds: string[];
  teacherName?: string;
  room?: string;
  notes?: string;
}

interface SchoolClass {
  id: string;
  name?: string;
  gradeKey?: string;
  section?: string;
}

interface SchoolTeacher {
  id: string;
  name?: string;
  email?: string;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const PERIODS = Array.from({ length: 8 }, (_, index) => index + 1);

export default function TimetableManagement({ viewOnly = false }: { viewOnly?: boolean }) {
  const { user, language } = useStore();
  const schoolId = user?.schoolId || user?.school || '';
  const canManage = !viewOnly && (user?.role === 'principal' || user?.role === 'admin');
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [form, setForm] = useState({ classId: '', dayOfWeek: 0, periodNumber: 1, subjectKey: '', teacherId: '', room: '', notes: '' });

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const entriesQuery = query(collection(db, 'timetableEntries'), where('schoolId', '==', schoolId));
    const classesQuery = query(collection(db, 'schoolClasses'), where('schoolId', '==', schoolId));
    const usersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));

    const unsubscribeEntries = onSnapshot(entriesQuery, (snapshot) => {
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TimetableEntry));
      next.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber);
      setEntries(next);
      setLoading(false);
    }, (error) => {
      console.error('Failed to load timetable:', error);
      toast.error(language === 'en' ? 'Failed to load timetable' : 'تعذر تحميل الجدول');
      setLoading(false);
    });

    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      setClasses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SchoolClass)));
    }, (error) => console.warn('Failed to load classes:', error));

    const unsubscribeTeachers = onSnapshot(usersQuery, (snapshot) => {
      setTeachers(snapshot.docs
        .filter((item) => item.data().role === 'teacher')
        .map((item) => ({ id: item.id, ...item.data() } as SchoolTeacher)));
    }, (error) => console.warn('Failed to load teachers:', error));

    return () => {
      unsubscribeEntries();
      unsubscribeClasses();
      unsubscribeTeachers();
    };
  }, [schoolId, language]);

  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const teacherById = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers]);
  const dayEntries = entries.filter((entry) => entry.dayOfWeek === selectedDay);

  const classLabel = (classId: string) => {
    const schoolClass = classById.get(classId);
    if (!schoolClass) return classId;
    return schoolClass.name || `${getGradeLabelAr(schoolClass.gradeKey)}${schoolClass.section ? ` — ${schoolClass.section}` : ''}`;
  };

  const openAdd = (dayOfWeek = selectedDay, periodNumber = 1) => {
    setForm({ classId: classes[0]?.id || '', dayOfWeek, periodNumber, subjectKey: '', teacherId: teachers[0]?.id || '', room: '', notes: '' });
    setIsAdding(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!schoolId || !user?.uid || !form.classId || !form.subjectKey.trim() || !form.teacherId) {
      toast.error(language === 'en' ? 'Complete the class, subject, and teacher fields.' : 'أكمل الصف والمادة والمعلم أولًا.');
      return;
    }
    setSaving(true);
    try {
      const teacher = teacherById.get(form.teacherId);
      await addDoc(collection(db, 'timetableEntries'), {
        schoolId,
        classId: form.classId,
        className: classLabel(form.classId),
        dayOfWeek: Number(form.dayOfWeek),
        periodNumber: Number(form.periodNumber),
        subjectKey: form.subjectKey.trim(),
        teacherIds: [form.teacherId],
        teacherName: teacher?.name || teacher?.email || form.teacherId,
        room: form.room.trim(),
        notes: form.notes.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success(language === 'en' ? 'Timetable entry saved' : 'تم حفظ حصة الجدول');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to save timetable entry:', error);
      toast.error(language === 'en' ? 'You do not have permission to save this entry.' : 'لا تملك صلاحية حفظ هذه الحصة أو حدث خطأ في الاتصال.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!window.confirm(language === 'en' ? 'Delete this timetable entry?' : 'هل تريد حذف حصة الجدول؟')) return;
    try {
      await deleteDoc(doc(db, 'timetableEntries', entryId));
      toast.success(language === 'en' ? 'Entry deleted' : 'تم حذف الحصة');
    } catch (error) {
      console.error('Failed to delete timetable entry:', error);
      toast.error(language === 'en' ? 'Failed to delete entry' : 'تعذر حذف الحصة');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-2">
            <CalendarClock className="w-5 h-5" />
            {language === 'en' ? 'Weekly timetable' : 'الجدول الأسبوعي'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{viewOnly ? 'جدول الحصص' : 'إدارة جدول الحصص'}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{viewOnly ? 'اعرض حصص مدرستك حسب اليوم والفترة.' : 'أنشئ جدولًا واضحًا مرتبطًا بالصفوف والمعلمين في المدرسة.'}</p>
        </div>
        {canManage && (
          <button onClick={() => openAdd()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> إضافة حصة
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-white dark:bg-gray-800 p-2 border border-gray-100 dark:border-gray-700">
        {DAYS.map((day, index) => (
          <button key={day} onClick={() => setSelectedDay(index)} className={`flex-1 min-w-[88px] rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${selectedDay === index ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-10 text-center text-gray-500">جاري تحميل الجدول...</div>
      ) : !schoolId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">لا يوجد حساب مدرسي مربوط بهذا المستخدم بعد.</div>
      ) : dayEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
          <Clock3 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h2 className="font-semibold text-gray-800 dark:text-white">لا توجد حصص في {DAYS[selectedDay]}</h2>
          <p className="mt-1 text-sm text-gray-500">{canManage ? 'أضف أول حصة لهذا اليوم من زر إدارة الجدول.' : 'سيظهر الجدول هنا بعد اعتماده من إدارة المدرسة.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dayEntries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-blue-600">الحصة {entry.periodNumber}</span>
                  <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{entry.subjectKey}</h2>
                </div>
                {canManage && <button onClick={() => handleDelete(entry.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="حذف الحصة"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /><span>{classLabel(entry.classId)}</span></div>
                <div className="flex items-center gap-2"><span className="h-4 w-4 text-center text-xs font-bold text-gray-400">م</span><span>{entry.teacherName || entry.teacherIds?.map((id) => teacherById.get(id)?.name || id).join('، ')}</span></div>
                {entry.room && <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-gray-400" /><span>القاعة: {entry.room}</span></div>}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PERIODS.slice(0, 4).map((period) => (
          <button key={period} disabled={!canManage} onClick={() => openAdd(selectedDay, period)} className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-3 text-right text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-transparent">
            <span className="block font-semibold text-gray-700 dark:text-gray-200">الفترة {period}</span>
            <span>{canManage ? 'إضافة حصة في هذا الموضع' : 'لا توجد بيانات إضافية'}</span>
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleSave} className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة حصة</h2><p className="mt-1 text-sm text-gray-500">ستحفظ الحصة داخل مدرسة المستخدم الحالية.</p></div>
              <button type="button" onClick={() => setIsAdding(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="إغلاق"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">الصف والشعبة<select required value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"><option value="">اختر الصف</option>{classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item.id)}</option>)}</select></label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">اليوم<select value={form.dayOfWeek} onChange={(event) => { const value = Number(event.target.value); setForm({ ...form, dayOfWeek: value }); setSelectedDay(value); }} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">رقم الحصة<select value={form.periodNumber} onChange={(event) => setForm({ ...form, periodNumber: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">{PERIODS.map((period) => <option key={period} value={period}>الحصة {period}</option>)}</select></label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">المادة<input required value={form.subjectKey} onChange={(event) => setForm({ ...form, subjectKey: event.target.value })} placeholder="مثال: الرياضيات" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700" /></label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">المعلم<select required value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"><option value="">اختر المعلم</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name || item.email || item.id}</option>)}</select></label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">القاعة<input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} placeholder="اختياري" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700" /></label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 sm:col-span-2">ملاحظات<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="اختياري" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsAdding(false)} className="rounded-xl px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">إلغاء</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'جارٍ الحفظ...' : 'حفظ الحصة'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
