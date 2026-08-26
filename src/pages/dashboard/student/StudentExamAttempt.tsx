/*
 * EduSmart design reminder: the exam room is focused and distraction-free.
 * Show one clear question hierarchy, persistent progress, and explicit submit
 * states. Correct answers never ship to the student; grading remains server-side.
 */
import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowRight, CheckCircle2, Clock3, FileText, LockKeyhole, Send, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';

interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
  points?: number;
}

interface ExamSchedule {
  id: string;
  title: string;
  subject?: string;
  subjectKey?: string;
  classId?: string;
  schoolId: string;
  scheduledAt?: { toDate?: () => Date } | string;
  date?: { toDate?: () => Date } | string;
  durationMinutes?: number;
  duration?: number;
  totalMarks?: number;
  status?: 'upcoming' | 'ongoing' | 'completed';
  questions?: ExamQuestion[];
}

interface ExamAttempt {
  examId: string;
  studentId: string;
  schoolId: string;
  answers: Record<string, number>;
  status: 'in_progress' | 'submitted';
  submittedAt?: unknown;
}

const toDate = (value: ExamSchedule['scheduledAt']) => {
  if (!value) return null;
  if (typeof value === 'object' && value.toDate) return value.toDate();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function StudentExamAttempt() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user, language } = useStore();
  const [exam, setExam] = useState<ExamSchedule | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const attemptId = examId && user?.uid ? `${examId}_${user.uid}` : '';

  useEffect(() => {
    if (!examId || !user?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'examSchedules', examId), (snapshot) => {
      if (!snapshot.exists()) {
        setExam(null);
        setLoading(false);
        return;
      }
      setExam({ id: snapshot.id, ...snapshot.data() } as ExamSchedule);
      setLoading(false);
    }, (error) => {
      console.error('Failed to load exam:', error);
      toast.error(language === 'en' ? 'Failed to load exam' : 'تعذر تحميل الاختبار');
      setLoading(false);
    });

    let active = true;
    getDoc(doc(db, 'examAttempts', attemptId)).then((snapshot) => {
      if (!active || !snapshot.exists()) return;
      const data = snapshot.data() as ExamAttempt;
      setAttempt(data);
      setAnswers(data.answers || {});
      setSubmitted(data.status === 'submitted');
    }).catch((error) => console.warn('No previous exam attempt:', error));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [attemptId, examId, language, user?.uid]);

  const questions = exam?.questions || [];
  const answeredCount = useMemo(() => Object.keys(answers).filter((key) => answers[key] !== undefined).length, [answers]);
  const examDate = toDate(exam?.scheduledAt || exam?.date);
  const duration = exam?.durationMinutes || exam?.duration || 60;
  const totalMarks = exam?.totalMarks || questions.reduce((sum, question) => sum + (question.points || 1), 0);

  const saveAttempt = async (status: 'in_progress' | 'submitted') => {
    if (!exam || !user?.uid || !attemptId || saving) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'examAttempts', attemptId), {
        examId: exam.id,
        studentId: user.uid,
        schoolId: exam.schoolId,
        answers,
        status,
        totalMarks,
        startedAt: attempt?.startedAt || serverTimestamp(),
        ...(status === 'submitted' ? { submittedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setAttempt((current) => ({ ...current, examId: exam.id, studentId: user.uid, schoolId: exam.schoolId, answers, status }));
      if (status === 'submitted') {
        setSubmitted(true);
        toast.success(language === 'en' ? 'Exam submitted successfully' : 'تم تسليم الاختبار بنجاح');
      } else {
        toast.success(language === 'en' ? 'Progress saved' : 'تم حفظ التقدم');
      }
    } catch (error) {
      console.error('Failed to save exam attempt:', error);
      toast.error(language === 'en' ? 'Could not save your attempt. Check your connection.' : 'تعذر حفظ المحاولة، تحقق من الاتصال بالإنترنت.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;
    if (questions.length > 0 && answeredCount < questions.length && !window.confirm('لم تجب عن كل الأسئلة. هل تريد التسليم؟')) return;
    await saveAttempt('submitted');
  };

  if (loading) return <div className="rounded-2xl bg-white p-10 text-center text-gray-500 dark:bg-gray-800">جاري تحميل غرفة الاختبار...</div>;
  if (!exam) return <div className="rounded-2xl bg-white p-10 text-center dark:bg-gray-800"><p className="font-semibold text-gray-800 dark:text-white">الاختبار غير موجود أو لم يعد متاحًا.</p><button onClick={() => navigate('/student/school-exams')} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white">العودة للاختبارات</button></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"><ArrowRight className="h-4 w-4" /> العودة</button>
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><FileText className="h-5 w-5" /><span className="text-sm font-semibold">{exam.subject || exam.subjectKey || 'اختبار مدرسي'}</span></div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{exam.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400"><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{duration} دقيقة</span><span>{totalMarks} درجة</span>{examDate && <span>{examDate.toLocaleString(language === 'en' ? 'en-US' : 'ar-SA')}</span>}</div>
        </div>
        <div className="min-w-[180px] rounded-2xl bg-blue-50 p-4 text-center dark:bg-blue-950/30"><p className="text-xs font-semibold text-blue-700 dark:text-blue-300">التقدم</p><p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">{answeredCount} / {questions.length}</p><p className="text-xs text-blue-700/70 dark:text-blue-300/70">{submitted ? 'تم التسليم' : 'إجابة محفوظة محليًا وسحابيًا'}</p></div>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h2 className="mt-3 text-xl font-bold text-emerald-900 dark:text-emerald-100">تم تسليم محاولتك</h2><p className="mt-2 text-sm text-emerald-800/80 dark:text-emerald-200/80">ستظهر النتيجة بعد اعتماد التصحيح من المعلم أو إدارة المدرسة.</p></div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20"><LockKeyhole className="mx-auto h-10 w-10" /><h2 className="mt-3 font-bold">لم تتم إضافة أسئلة بعد</h2><p className="mt-1 text-sm">يمكنك العودة لاحقًا بعد نشر أسئلة الاختبار من المعلم.</p></div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <article key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{index + 1}</span><div className="flex-1"><h2 className="font-semibold leading-7 text-gray-900 dark:text-white">{question.prompt}</h2><p className="mt-1 text-xs text-gray-500">{question.points || 1} درجة</p><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${answers[question.id] === optionIndex ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30' : 'border-gray-200 hover:border-blue-300 dark:border-gray-700'}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="h-4 w-4 accent-blue-600" /><span className="text-sm text-gray-700 dark:text-gray-200">{option}</span></label>)}</div></div></div>
            </article>
          ))}
          <div className="sticky bottom-4 flex flex-wrap justify-end gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95"><button disabled={saving} onClick={() => saveAttempt('in_progress')} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"><Save className="h-4 w-4" /> حفظ التقدم</button><button disabled={saving} onClick={handleSubmit} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Send className="h-4 w-4" /> {saving ? 'جارٍ الحفظ...' : 'تسليم الاختبار'}</button></div>
        </div>
      )}
    </div>
  );
}
