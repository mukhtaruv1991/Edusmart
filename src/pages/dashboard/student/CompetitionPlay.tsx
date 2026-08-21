import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowRight, CheckCircle2, Clock3, Loader2, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';

interface Competition {
  id: string;
  title: string;
  description?: string;
  school?: string;
  schoolId?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
}

interface CompetitionQuestion {
  id: string;
  text?: string;
  prompt?: string;
  options: string[];
  correctOption?: number;
  correctAnswer?: string;
  points?: number;
}

interface Participant {
  id: string;
  name: string;
  score: number;
  total: number;
  percentage: number;
}

export default function CompetitionPlay() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { user, language } = useStore();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getStatus = (item: Competition) => {
    const now = Date.now();
    const start = item.startDate ? new Date(item.startDate).getTime() : 0;
    const end = item.endDate ? new Date(item.endDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (item.status === 'completed' || now > end) return 'completed';
    if (item.status === 'ongoing' || (start && now >= start && now <= end)) return 'ongoing';
    return 'upcoming';
  };

  useEffect(() => {
    if (!competitionId || !user?.uid) return;
    let active = true;
    const load = async () => {
      try {
        const competitionSnapshot = await getDoc(doc(db, 'competitions', competitionId));
        if (!competitionSnapshot.exists()) throw new Error('competition-not-found');
        const competitionData = { id: competitionSnapshot.id, ...competitionSnapshot.data() } as Competition;
        const questionSnapshot = await getDocs(collection(db, 'competitions', competitionId, 'questions'));
        const participantSnapshot = await getDocs(collection(db, 'competitions', competitionId, 'participants'));
        if (!active) return;
        setCompetition(competitionData);
        setQuestions(questionSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CompetitionQuestion)));
        setParticipants(participantSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Participant)).sort((a, b) => b.score - a.score).slice(0, 10));
      } catch (error) {
        console.error('Failed to load competition:', error);
        toast.error(language === 'ar' ? 'تعذر تحميل المسابقة' : 'Could not load the competition');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [competitionId, language, user?.uid]);

  const totalPoints = useMemo(() => questions.reduce((sum, question) => sum + (question.points || 1), 0), [questions]);

  const handleStart = async () => {
    if (!competitionId || !user?.uid) return;
    try {
      await setDoc(doc(db, 'competitions', competitionId, 'participants', user.uid), {
        uid: user.uid,
        name: user.name,
        startedAt: serverTimestamp(),
        score: 0,
        total: totalPoints,
        percentage: 0,
      }, { merge: true });
      setStarted(true);
    } catch (error) {
      console.error('Failed to start competition:', error);
      toast.error(language === 'ar' ? 'تعذر تسجيل المشاركة' : 'Could not register your participation');
    }
  };

  const handleSubmit = async () => {
    if (!competitionId || !user?.uid || !questions.length) return;
    setSubmitting(true);
    const earned = questions.reduce((sum, question) => {
      const selected = answers[question.id];
      const correct = typeof question.correctOption === 'number'
        ? selected === question.correctOption
        : question.options[selected] === question.correctAnswer;
      return sum + (correct ? question.points || 1 : 0);
    }, 0);
    const percentage = totalPoints ? Math.round((earned / totalPoints) * 100) : 0;
    try {
      await setDoc(doc(db, 'competitions', competitionId, 'participants', user.uid), {
        uid: user.uid,
        name: user.name,
        score: earned,
        total: totalPoints,
        percentage,
        answers,
        completedAt: serverTimestamp(),
      }, { merge: true });
      await addDoc(collection(db, 'competitionAttempts'), {
        competitionId,
        studentId: user.uid,
        studentName: user.name,
        answers,
        score: earned,
        total: totalPoints,
        percentage,
        completedAt: serverTimestamp(),
      });
      setScore(earned);
      setSubmitted(true);
      toast.success(language === 'ar' ? 'تم تسليم المسابقة بنجاح' : 'Competition submitted successfully');
    } catch (error) {
      console.error('Failed to submit competition:', error);
      toast.error(language === 'ar' ? 'تعذر حفظ النتيجة' : 'Could not save the result');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center gap-2 text-gray-500"><Loader2 className="h-5 w-5 animate-spin" />{language === 'ar' ? 'جاري تحميل المسابقة...' : 'Loading competition...'}</div>;
  if (!competition) return <div className="rounded-2xl bg-white p-8 text-center dark:bg-gray-800">{language === 'ar' ? 'المسابقة غير موجودة.' : 'Competition not found.'}</div>;

  const status = getStatus(competition);
  const canPlay = status === 'ongoing' || (!competition.startDate && !competition.endDate);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/student/competitions" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"><ArrowRight className="h-4 w-4" />{language === 'ar' ? 'العودة إلى المسابقات' : 'Back to competitions'}</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <main className="space-y-5">
          <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="mb-2 text-sm text-blue-100">{language === 'ar' ? 'مسابقة مدرسية' : 'School competition'}</p><h1 className="text-3xl font-bold">{competition.title}</h1><p className="mt-2 max-w-2xl text-blue-100">{competition.description || (language === 'ar' ? 'اختبر معارفك ونافس زملاءك.' : 'Test your knowledge and compete with your classmates.')}</p></div>
              <Trophy className="h-12 w-12 text-yellow-300" />
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-white/15 px-3 py-1">{status === 'ongoing' ? (language === 'ar' ? 'جارية الآن' : 'Live now') : status === 'completed' ? (language === 'ar' ? 'منتهية' : 'Completed') : (language === 'ar' ? 'قادمة' : 'Upcoming')}</span><span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1"><Clock3 className="h-4 w-4" />{competition.durationMinutes || 30} {language === 'ar' ? 'دقيقة' : 'min'}</span></div>
          </section>

          {!started && !submitted ? (
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'جاهز للتحدي؟' : 'Ready for the challenge?'}</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{language === 'ar' ? `تتكون المسابقة من ${questions.length} أسئلة بإجمالي ${totalPoints} نقطة.` : `This competition has ${questions.length} questions for ${totalPoints} points.`}</p>
              {!questions.length ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{language === 'ar' ? 'لم يضف المنظم أسئلة بعد. ستظهر هنا تلقائياً بعد نشرها.' : 'The organizer has not added questions yet.'}</p> : null}
              <button type="button" disabled={!canPlay || !questions.length} onClick={() => void handleStart()} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{status === 'completed' ? (language === 'ar' ? 'انتهت المسابقة' : 'Competition ended') : language === 'ar' ? 'ابدأ المسابقة' : 'Start competition'}</button>
            </section>
          ) : submitted ? (
            <section className="rounded-2xl border border-green-100 bg-green-50 p-8 text-center dark:border-green-900/40 dark:bg-green-900/20"><CheckCircle2 className="mx-auto h-16 w-16 text-green-600" /><h2 className="mt-4 text-2xl font-bold text-green-900 dark:text-green-200">{language === 'ar' ? 'أحسنت! تم حفظ إجابتك' : 'Well done! Your answer was saved'}</h2><p className="mt-2 text-green-800 dark:text-green-300">{language === 'ar' ? `نتيجتك: ${score} من ${totalPoints} (${totalPoints ? Math.round(((score || 0) / totalPoints) * 100) : 0}%)` : `Your score: ${score} / ${totalPoints}`}</p></section>
          ) : (
            <section className="space-y-4">
              {questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="font-semibold text-gray-900 dark:text-white">{index + 1}. {question.text || question.prompt}</p><div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${answers[question.id] === optionIndex ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-blue-300 dark:border-gray-700'}`}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} />{option}</label>)}</div></article>)}
              <button type="button" disabled={submitting || Object.keys(answers).length !== questions.length} onClick={() => void handleSubmit()} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : language === 'ar' ? 'تسليم الإجابات' : 'Submit answers'}</button>
            </section>
          )}
        </main>

        <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /><h2 className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'لوحة الصدارة' : 'Leaderboard'}</h2></div><div className="mt-4 space-y-3">{participants.length ? participants.map((participant, index) => <div key={participant.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{participant.name}</p><p className="text-xs text-gray-500">{participant.percentage}%</p></div><span className="text-sm font-bold text-blue-600">{participant.score}</span></div>) : <p className="py-5 text-center text-sm text-gray-500">{language === 'ar' ? 'لا توجد نتائج بعد.' : 'No results yet.'}</p>}</div><div className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-700">{language === 'ar' ? 'تظهر النتائج بعد تسليم الإجابات، وتحدد قواعد Firestore من يمكنه رؤية اللوحة.' : 'Results appear after submission and are protected by Firestore rules.'}</div></aside>
      </div>
    </div>
  );
}
