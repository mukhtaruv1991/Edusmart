// Design philosophy: calm knowledge lab — clear hierarchy, purposeful controls, and no fabricated activity.
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { Calendar, CheckCircle2, Clock3, Plus, Trash2, Trophy, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';

type CompetitionType = 'academic' | 'sports' | 'arts' | 'other';
type CompetitionStatus = 'upcoming' | 'ongoing' | 'completed';

type CompetitionQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
};

type SchoolClass = { id: string; name: string; gradeKey?: string; schoolId?: string };

type Competition = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: CompetitionType;
  status: CompetitionStatus;
  schoolId?: string;
  targetAudience?: 'school' | 'grade' | 'class';
  gradeKey?: string;
  classId?: string;
  questionCount?: number;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export default function CompetitionsManagement() {
  const { user, language } = useStore();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<CompetitionType>('academic');
  const [gradeKey, setGradeKey] = useState('all');
  const [targetAudience, setTargetAudience] = useState<'school' | 'grade' | 'class'>('school');
  const [classId, setClassId] = useState('');
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [questionPoints, setQuestionPoints] = useState(1);

  const schoolId = user?.schoolId || user?.school || '';

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    const unsubscribe = onSnapshot(query(collection(db, 'competitions'), where('schoolId', '==', schoolId)), (snapshot) => {
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Competition));
      next.sort((a, b) => a.startDate.localeCompare(b.startDate));
      setCompetitions(next);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching competitions:', error);
      toast.error(language === 'en' ? 'Failed to load competitions.' : 'فشل تحميل المسابقات.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [language, schoolId]);

  useEffect(() => {
    if (!schoolId) { setSchoolClasses([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, 'classes'), where('schoolId', '==', schoolId)), (snapshot) => {
      setSchoolClasses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SchoolClass)));
    }, (error) => {
      console.error('Error fetching school classes:', error);
      toast.error(language === 'en' ? 'Could not load school classes.' : 'تعذر تحميل شعب المدرسة.');
    });
    return () => unsubscribe();
  }, [language, schoolId]);

  const computedStatus = (competition: Competition): CompetitionStatus => {
    const now = Date.now();
    const start = new Date(competition.startDate).getTime();
    const end = new Date(competition.endDate).getTime();
    if (Number.isFinite(start) && now < start) return 'upcoming';
    if (Number.isFinite(end) && now > end) return 'completed';
    return 'ongoing';
  };

  const addQuestion = () => {
    const prompt = questionPrompt.trim();
    const options = questionOptions.map((option) => option.trim()).filter(Boolean);
    if (!prompt || options.length < 2) {
      toast.error(language === 'en' ? 'Add a question and at least two options.' : 'أدخل نص السؤال وخيارين على الأقل.');
      return;
    }
    const correctAnswer = options[Math.min(correctOption, options.length - 1)];
    setQuestions((current) => [...current, {
      id: `q-${Date.now()}-${current.length}`,
      prompt,
      options,
      correctAnswer,
      points: Math.max(1, questionPoints),
    }]);
    setQuestionPrompt('');
    setQuestionOptions(['', '', '', '']);
    setCorrectOption(0);
    setQuestionPoints(1);
  };

  const removeQuestion = (questionId: string) => setQuestions((current) => current.filter((question) => question.id !== questionId));

  const resetForm = () => {
    setTitle(''); setDescription(''); setStartDate(''); setEndDate(''); setType('academic'); setGradeKey('all'); setTargetAudience('school'); setClassId('');
    setQuestions([]); setQuestionPrompt(''); setQuestionOptions(['', '', '', '']); setCorrectOption(0); setQuestionPoints(1);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.uid || !schoolId || !title.trim() || !startDate || !endDate || new Date(endDate) < new Date(startDate) || (targetAudience === 'grade' && gradeKey === 'all') || (targetAudience === 'class' && !classId)) {
      toast.error(language === 'en' ? 'Complete the fields and check the dates.' : 'أكمل الحقول وتحقق من التواريخ.');
      return;
    }
    if (!questions.length) {
      toast.error(language === 'en' ? 'Add at least one question before publishing.' : 'أضف سؤالًا واحدًا على الأقل قبل نشر المسابقة.');
      return;
    }
    setSaving(true);
    try {
      const competitionRef = doc(collection(db, 'competitions'));
      const batch = writeBatch(db);
      batch.set(competitionRef, {
        title: title.trim(), description: description.trim(), startDate, endDate, type,
        status: 'upcoming', schoolId, school: user.school || schoolId, createdBy: user.uid,
        gradeKey: targetAudience === 'grade' ? gradeKey : 'all', classId: targetAudience === 'class' ? classId : '', targetAudience,
        questionCount: questions.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      questions.forEach((question) => batch.set(doc(db, 'competitions', competitionRef.id, 'questions', question.id), {
        prompt: question.prompt, options: question.options, correctAnswer: question.correctAnswer, points: question.points,
        competitionId: competitionRef.id, schoolId, createdBy: user.uid, createdAt: serverTimestamp(),
      }));
      await batch.commit();
      toast.success(language === 'en' ? 'Competition and questions published.' : 'تم نشر المسابقة وأسئلتها.');
      setIsAdding(false); resetForm();
    } catch (error) {
      console.error('Error adding competition:', error);
      toast.error(language === 'en' ? 'Failed to publish competition.' : 'فشل نشر المسابقة.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (competition: Competition) => {
    if (!window.confirm(language === 'en' ? 'Delete this competition and its questions?' : 'هل تريد حذف المسابقة وأسئلتها؟')) return;
    try {
      const questionQuery = query(collection(db, 'competitions', competition.id, 'questions'));
      const snapshot = await getDocs(questionQuery);
      const batch = writeBatch(db);
      snapshot.docs.forEach((item) => batch.delete(item.ref));
      batch.delete(doc(db, 'competitions', competition.id));
      await batch.commit();
      toast.success(language === 'en' ? 'Competition deleted.' : 'تم حذف المسابقة.');
    } catch (error) {
      console.error('Error deleting competition:', error);
      toast.error(language === 'en' ? 'Failed to delete competition.' : 'فشل حذف المسابقة.');
    }
  };

  const statusLabel = (status: CompetitionStatus) => status === 'upcoming' ? (language === 'en' ? 'Upcoming' : 'قادمة') : status === 'ongoing' ? (language === 'en' ? 'Ongoing' : 'جارية') : (language === 'en' ? 'Completed' : 'مكتملة');
  const statusClass = (status: CompetitionStatus) => status === 'upcoming' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : status === 'ongoing' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  const gradeOptions = useMemo(() => ['all', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'], []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-6 dark:border-blue-900/40 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Trophy className="h-6 w-6 text-blue-600" />{language === 'en' ? 'Competitions' : 'المسابقات'}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{language === 'en' ? 'Publish school competitions with real questions and controlled audience.' : 'نشر مسابقات مدرسية بأسئلة حقيقية وجمهور محدد.'}</p></div>
        <button type="button" onClick={() => { resetForm(); setIsAdding((value) => !value); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"><Plus className="h-4 w-4" />{language === 'en' ? 'New competition' : 'مسابقة جديدة'}</button>
      </header>

      {isAdding && <form onSubmit={handleAdd} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Title' : 'العنوان'}<input className={inputClass} required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Type' : 'النوع'}<select className={inputClass} value={type} onChange={(event) => setType(event.target.value as CompetitionType)}><option value="academic">{language === 'en' ? 'Academic' : 'أكاديمية'}</option><option value="sports">{language === 'en' ? 'Sports' : 'رياضية'}</option><option value="arts">{language === 'en' ? 'Arts' : 'فنية'}</option><option value="other">{language === 'en' ? 'Other' : 'أخرى'}</option></select></label><label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Starts' : 'تبدأ'}<input className={inputClass} type="datetime-local" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Ends' : 'تنتهي'}<input className={inputClass} type="datetime-local" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Audience' : 'الجمهور'}<select className={inputClass} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value as 'school' | 'grade' | 'class')}><option value="school">{language === 'en' ? 'Whole school' : 'المدرسة كاملة'}</option><option value="grade">{language === 'en' ? 'Specific grade' : 'صف محدد'}</option><option value="class">{language === 'en' ? 'Specific class' : 'شعبة محددة'}</option></select></label>{targetAudience === 'grade' && <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Grade' : 'الصف'}<select className={inputClass} value={gradeKey} onChange={(event) => setGradeKey(event.target.value)}>{gradeOptions.map((grade) => <option key={grade} value={grade}>{grade === 'all' ? (language === 'en' ? 'Choose grade' : 'اختر الصف') : grade.replace('grade', language === 'en' ? 'Grade ' : 'الصف ')}</option>)}</select></label>}{targetAudience === 'class' && <label className="space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Class' : 'الشعبة'}<select className={inputClass} value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">{language === 'en' ? 'Choose class' : 'اختر الشعبة'}</option>{schoolClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}{schoolClass.gradeKey ? ` — ${schoolClass.gradeKey}` : ''}</option>)}</select></label>}</div>
        <label className="block space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{language === 'en' ? 'Description' : 'الوصف'}<textarea className={`${inputClass} min-h-20`} required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900 dark:text-white">{language === 'en' ? 'Questions' : 'الأسئلة'}</h2><p className="text-xs text-slate-500">{language === 'en' ? `${questions.length} question(s) ready` : `${questions.length} سؤال جاهز`}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{language === 'en' ? 'MCQ' : 'اختيار من متعدد'}</span></div><div className="grid gap-3"><input className={inputClass} placeholder={language === 'en' ? 'Question text' : 'نص السؤال'} value={questionPrompt} onChange={(event) => setQuestionPrompt(event.target.value)} />{questionOptions.map((option, index) => <div key={index} className="flex gap-2"><input className={inputClass} placeholder={`${language === 'en' ? 'Option' : 'الخيار'} ${index + 1}`} value={option} onChange={(event) => setQuestionOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><label className="flex w-24 shrink-0 items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><input type="radio" name="correctOption" checked={correctOption === index} onChange={() => setCorrectOption(index)} />{language === 'en' ? 'Correct' : 'صحيح'}</label></div>)}<div className="flex items-center gap-3"><label className="text-xs text-slate-600 dark:text-slate-300">{language === 'en' ? 'Points' : 'الدرجة'}<input className={`${inputClass} mt-1 w-24`} type="number" min="1" value={questionPoints} onChange={(event) => setQuestionPoints(Number(event.target.value))} /></label><button type="button" onClick={addQuestion} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300"><Plus className="h-4 w-4" />{language === 'en' ? 'Add question' : 'إضافة السؤال'}</button></div></div>{questions.length > 0 && <div className="space-y-2">{questions.map((question, index) => <div key={question.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{index + 1}. {question.prompt}</p><p className="mt-1 text-xs text-slate-500">{question.options.join(' · ')} · {question.points} {language === 'en' ? 'pts' : 'درجة'}</p></div><button type="button" onClick={() => removeQuestion(question.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20" aria-label={language === 'en' ? 'Remove question' : 'حذف السؤال'}><X className="h-4 w-4" /></button></div>)}</div>}</section>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => { setIsAdding(false); resetForm(); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">{language === 'en' ? 'Cancel' : 'إلغاء'}</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? (language === 'en' ? 'Publishing...' : 'جاري النشر...') : (language === 'en' ? 'Publish competition' : 'نشر المسابقة')}</button></div>
      </form>}

      {loading ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">{language === 'en' ? 'Loading competitions...' : 'جاري تحميل المسابقات...'}</div> : competitions.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500"><Trophy className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-3">{language === 'en' ? 'No competitions have been published.' : 'لم تُنشر أي مسابقات بعد.'}</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{competitions.map((competition) => { const status = computedStatus(competition); return <article key={competition.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Trophy className="h-5 w-5" /></div><div><h2 className="font-bold text-slate-900 dark:text-white">{competition.title}</h2><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${statusClass(status)}`}>{statusLabel(status)}</span></div></div><button type="button" onClick={() => void handleDelete(competition)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20" aria-label={language === 'en' ? 'Delete competition' : 'حذف المسابقة'}><Trash2 className="h-4 w-4" /></button></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{competition.description}</p><dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-700"><div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{language === 'en' ? 'Window' : 'الفترة'}</dt><dd dir="ltr">{competition.startDate} — {competition.endDate}</dd></div><div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{language === 'en' ? 'Audience' : 'الجمهور'}</dt><dd>{competition.targetAudience === 'grade' ? competition.gradeKey : competition.targetAudience === 'class' ? (schoolClasses.find((schoolClass) => schoolClass.id === competition.classId)?.name || competition.classId || (language === 'en' ? 'Class' : 'شعبة')) : (language === 'en' ? 'School' : 'المدرسة')}</dd></div><div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'en' ? 'Questions' : 'الأسئلة'}</dt><dd>{competition.questionCount || 0}</dd></div><div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{language === 'en' ? 'State' : 'الحالة'}</dt><dd>{statusLabel(status)}</dd></div></dl></article>; })}</div>}
    </div>
  );
}
