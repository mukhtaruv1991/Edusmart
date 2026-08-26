import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye, EyeOff, Filter, Loader2, RefreshCw, Save, Search, TrendingUp, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../lib/store';
import { listGrades, listSchoolStudents, saveGrade, type AssessmentType, type GradeRecord, type SchoolStudent } from '../../lib/academicRecords';

const assessments: Array<{ value: AssessmentType; labelAr: string; labelEn: string }> = [
  { value: 'quiz', labelAr: 'اختبار قصير', labelEn: 'Quiz' },
  { value: 'assignment', labelAr: 'واجب', labelEn: 'Assignment' },
  { value: 'monthly', labelAr: 'اختبار شهري', labelEn: 'Monthly' },
  { value: 'midterm', labelAr: 'نصف العام', labelEn: 'Midterm' },
  { value: 'final', labelAr: 'نهائي', labelEn: 'Final' },
  { value: 'annual', labelAr: 'سنوي', labelEn: 'Annual' },
];

const subjectOptions = [
  ['mathematics', 'الرياضيات', 'Mathematics'],
  ['arabic', 'اللغة العربية', 'Arabic'],
  ['english', 'اللغة الإنجليزية', 'English'],
  ['science', 'العلوم', 'Science'],
  ['social-studies', 'الدراسات الاجتماعية', 'Social Studies'],
  ['islamic-studies', 'التربية الإسلامية', 'Islamic Studies'],
] as const;

export default function GradesManagement() {
  const { user, language } = useStore();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectKey, setSubjectKey] = useState(subjectOptions[0][0]);
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [visibleToStudent, setVisibleToStudent] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<AssessmentType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const schoolId = user?.schoolId || '';
  const load = async () => {
    if (!schoolId) { setLoading(false); setError(language === 'ar' ? 'لا توجد مدرسة مرتبطة بهذا الحساب بعد.' : 'This account is not linked to a school yet.'); return; }
    setLoading(true); setError('');
    try {
      const [studentList, gradeList] = await Promise.all([listSchoolStudents(schoolId), listGrades(schoolId)]);
      setStudents(studentList); setGrades(gradeList); if (!selectedStudentId && studentList[0]) setSelectedStudentId(studentList[0].uid);
    } catch (loadError) {
      console.error('Unable to load grades:', loadError);
      setError(language === 'ar' ? 'تعذر تحميل الطلاب أو الدرجات. راجع صلاحيات Firestore.' : 'Unable to load students or grades. Check Firestore permissions.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [schoolId]);

  const selectedStudent = students.find((student) => student.uid === selectedStudentId);
  const subject = subjectOptions.find((option) => option[0] === subjectKey);
  const filteredGrades = useMemo(() => grades.filter((grade) => (filterType === 'all' || grade.assessmentType === filterType) && `${grade.studentName} ${grade.subjectLabel} ${grade.assessmentTitle}`.toLowerCase().includes(filterText.trim().toLowerCase())), [grades, filterText, filterType]);
  const average = filteredGrades.length ? Math.round(filteredGrades.reduce((total, grade) => total + (grade.score / grade.maxScore) * 100, 0) / filteredGrades.length) : 0;

  const save = async () => {
    const numericScore = Number(score); const numericMax = Number(maxScore);
    if (!schoolId || !selectedStudent || !subject || !assessmentTitle.trim() || !Number.isFinite(numericScore) || !Number.isFinite(numericMax) || numericMax <= 0 || numericScore < 0 || numericScore > numericMax) {
      const message = language === 'ar' ? 'أكمل بيانات الدرجة وتأكد أن الدرجة ضمن الحد الأعلى.' : 'Complete the grade details and ensure the score is within the maximum.';
      setError(message); toast.error(message); return;
    }
    setSaving(true); setError('');
    try {
      await saveGrade({ schoolId, studentId: selectedStudent.uid, studentName: selectedStudent.name, gradeKey: selectedStudent.gradeKey, classId: selectedStudent.classId, subjectKey: subject[0], subjectLabel: language === 'ar' ? subject[1] : subject[2], assessmentType, assessmentTitle: assessmentTitle.trim(), score: Math.round((numericScore / numericMax) * 10000) / 100, maxScore: 100, visibleToStudent });
      toast.success(language === 'ar' ? 'تم حفظ الدرجة.' : 'Grade saved.'); setAssessmentTitle(''); setScore(''); await load();
    } catch (saveError) {
      console.error('Unable to save grade:', saveError);
      const message = language === 'ar' ? 'تعذر حفظ الدرجة. يجب استخدام جلسة Firebase حقيقية للمعلم أو المدير.' : 'Unable to save grade. Use a real Firebase teacher or principal session.';
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:flex-row sm:items-end sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Academic records · Grades</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{language === 'ar' ? 'الدرجات والتقييمات' : 'Grades and assessments'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{language === 'ar' ? 'سجّل نتائج الطالب، وحدد ظهورها، وراجع السجل الأكاديمي من مصدر Firestore.' : 'Record student results, control visibility, and review the academic record from Firestore.'}</p></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><TrendingUp className="h-5 w-5 text-emerald-300" /><div><p className="text-xs text-slate-400">{language === 'ar' ? 'متوسط النتائج المعروضة' : 'Displayed average'}</p><p className="text-xl font-black">{average}%</p></div></div></header>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
    <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"><Save className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900 dark:text-white">{language === 'ar' ? 'إدخال درجة' : 'Record a grade'}</h2><p className="text-xs text-slate-500">{language === 'ar' ? 'كل حفظ يحدّث السجل مع المسؤول والوقت.' : 'Every save records the actor and timestamp.'}</p></div></div><div className="space-y-4"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الطالب' : 'Student'}<select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="input-field mt-1"><option value="">{language === 'ar' ? 'اختر طالبًا' : 'Select a student'}</option>{students.map((student) => <option key={student.uid} value={student.uid}>{student.name} · {student.studentIdentifier || student.gradeKey || ''}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'المادة' : 'Subject'}<select value={subjectKey} onChange={(event) => setSubjectKey(event.target.value)} className="input-field mt-1">{subjectOptions.map((option) => <option key={option[0]} value={option[0]}>{language === 'ar' ? option[1] : option[2]}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'نوع التقييم' : 'Assessment'}<select value={assessmentType} onChange={(event) => setAssessmentType(event.target.value as AssessmentType)} className="input-field mt-1">{assessments.map((item) => <option key={item.value} value={item.value}>{language === 'ar' ? item.labelAr : item.labelEn}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'عنوان التقييم' : 'Title'}<input value={assessmentTitle} onChange={(event) => setAssessmentTitle(event.target.value)} className="input-field mt-1" placeholder={language === 'ar' ? 'مثال: اختبار الوحدة الأولى' : 'e.g. Unit 1 quiz'} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الدرجة' : 'Score'}<input value={score} onChange={(event) => setScore(event.target.value)} type="number" min="0" className="input-field mt-1" placeholder="85" /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'ar' ? 'الحد الأعلى' : 'Maximum'}<input value={maxScore} onChange={(event) => setMaxScore(event.target.value)} type="number" min="1" className="input-field mt-1" /></label></div><button type="button" onClick={() => setVisibleToStudent((current) => !current)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"><span>{language === 'ar' ? 'إظهار الدرجة للطالب وولي الأمر' : 'Show grade to student and parent'}</span>{visibleToStudent ? <Eye className="h-5 w-5 text-emerald-600" /> : <EyeOff className="h-5 w-5 text-slate-400" />}</button><button type="button" disabled={saving || loading} onClick={() => void save()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{language === 'ar' ? 'حفظ الدرجة' : 'Save grade'}</button></div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-bold text-slate-900 dark:text-white">{language === 'ar' ? 'سجل الدرجات' : 'Grade register'}</h2><p className="text-xs text-slate-500">{grades.length} {language === 'ar' ? 'سجل محفوظ' : 'saved records'}</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"><RefreshCw className="h-4 w-4" />{language === 'ar' ? 'تحديث' : 'Refresh'}</button></div><div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]"><div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filterText} onChange={(event) => setFilterText(event.target.value)} className="input-field ps-10" placeholder={language === 'ar' ? 'ابحث في السجل' : 'Search register'} /></div><label className="relative"><Filter className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><select value={filterType} onChange={(event) => setFilterType(event.target.value as AssessmentType | 'all')} className="input-field ps-10"><option value="all">{language === 'ar' ? 'كل الأنواع' : 'All types'}</option>{assessments.map((item) => <option key={item.value} value={item.value}>{language === 'ar' ? item.labelAr : item.labelEn}</option>)}</select></label></div>{loading ? <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="me-2 h-5 w-5 animate-spin" />{language === 'ar' ? 'تحميل...' : 'Loading...'}</div> : !filteredGrades.length ? <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900/40">{language === 'ar' ? 'لا توجد درجات محفوظة بعد.' : 'No grades saved yet.'}</p> : <div className="space-y-3">{filteredGrades.map((grade) => <article key={grade.id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900 dark:text-white">{grade.studentName}</p><p className="mt-1 text-sm text-slate-500">{grade.subjectLabel} · {grade.assessmentTitle}</p></div><span className={`text-lg font-black ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{grade.score}%</span></div><div className="mt-3 flex items-center justify-between text-xs text-slate-400"><span>{assessments.find((item) => item.value === grade.assessmentType)?.[language === 'ar' ? 'labelAr' : 'labelEn']}</span><span className="flex items-center gap-1">{grade.visibleToStudent ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{grade.visibleToStudent ? (language === 'ar' ? 'مرئية' : 'Visible') : (language === 'ar' ? 'مخفية' : 'Hidden')}</span></div></article>)}</div>}</div></section>
  </div>;
}
