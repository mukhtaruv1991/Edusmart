import { useState } from 'react';
import { useStore } from '../../lib/store';
import { CurriculumBook, CurriculumUnit, CurriculumLesson, StudyQuiz, StudyQuizQuestion } from '../../types/curriculum';
import { saveStudyQuiz } from '../../lib/studyStorage';
import { GoogleGenAI, Type } from '@google/genai';
import {
  Brain, Sparkles, CheckCircle2, XCircle, Award, RotateCcw,
  Loader2, Plus, Calendar, HelpCircle, ChevronRight, Play
} from 'lucide-react';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface StudyQuizzesViewProps {
  book: CurriculumBook;
  quizzes: StudyQuiz[];
  onQuizzesChange: (quizzes: StudyQuiz[]) => void;
  targetLesson?: CurriculumLesson;
}

export default function StudyQuizzesView({
  book,
  quizzes,
  onQuizzesChange,
  targetLesson,
}: StudyQuizzesViewProps) {
  const { language, user } = useStore();
  const [activeQuiz, setActiveQuiz] = useState<StudyQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [generating, setGenerating] = useState(false);

  // New Quiz Generator Modal state
  const [selectedUnitId, setSelectedUnitId] = useState<string>(book.units[0]?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(targetLesson?.id || book.units[0]?.lessons[0]?.id || '');
  const [questionCount, setQuestionCount] = useState<number>(3);

  const currentUnit = book.units.find(u => u.id === selectedUnitId);
  const currentLesson = currentUnit?.lessons.find(l => l.id === selectedLessonId);

  const filteredQuizzes = quizzes.filter(q => q.curriculumId === book.id);

  const handleGenerateQuiz = async () => {
    if (!currentLesson) return;
    setGenerating(true);
    try {
      const prompt = `Generate an interactive school quiz of ${questionCount} multiple-choice questions for Grade "${book.grade}", Subject "${book.subject}", Unit "${currentUnit?.title}", Lesson "${currentLesson.title}".
Return the result strictly as a valid JSON object matching this schema:
{
  "title": "اختبار تدريبي في ${currentLesson.title}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text here in Arabic?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct..."
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (!parsed.questions || parsed.questions.length === 0) {
        throw new Error('Invalid quiz response');
      }

      const newQuiz: StudyQuiz = {
        id: 'quiz-' + Date.now(),
        studentId: user?.uid || 'guest',
        curriculumId: book.id,
        subject: book.subject,
        unitId: currentUnit?.id,
        unitTitle: currentUnit?.title,
        lessonId: currentLesson?.id,
        lessonTitle: currentLesson?.title,
        title: parsed.title || `اختبار تدريبي: ${currentLesson.title}`,
        questions: parsed.questions,
        totalQuestions: parsed.questions.length,
        createdAt: new Date().toISOString(),
        isCompleted: false,
      };

      await saveStudyQuiz(newQuiz);
      onQuizzesChange([newQuiz, ...quizzes]);
      setActiveQuiz(newQuiz);
      setSelectedAnswers({});
      setShowResults(false);
      toast.success(language === 'en' ? 'Smart quiz generated successfully!' : 'تم توليد الاختبار الذكي بنجاح!');
    } catch (err) {
      console.error(err);
      toast.error(language === 'en' ? 'Failed to generate quiz' : 'تعذر توليد الاختبار، يرجى المحاولة ثانية');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      const studentAns = selectedAnswers[q.id || `q-${idx}`];
      if (studentAns === q.correctAnswer) {
        score += 1;
      }
    });

    const updatedQuiz: StudyQuiz = {
      ...activeQuiz,
      score,
      isCompleted: true,
      questions: activeQuiz.questions.map((q, idx) => ({
        ...q,
        studentAnswer: selectedAnswers[q.id || `q-${idx}`],
      }))
    };

    await saveStudyQuiz(updatedQuiz);
    onQuizzesChange(quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
    setActiveQuiz(updatedQuiz);
    setShowResults(true);
    toast.success(language === 'en' ? `Quiz completed! Score: ${score}/${activeQuiz.totalQuestions}` : `اكتمل الاختبار! النتيجة: ${score} من ${activeQuiz.totalQuestions}`);
  };

  return (
    <div className="space-y-4">
      {/* Top Generator Banner */}
      {!activeQuiz && (
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-6 rounded-3xl shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                {language === 'en' ? 'AI Quiz Engine' : 'محرك الاختبارات الذاتية بالذكاء الاصطناعي'}
              </span>
              <h3 className="text-xl font-bold mt-2">
                {language === 'en' ? 'Create Custom Practice Quiz' : 'توليد اختبار تدريبي فوري ومخصص'}
              </h3>
              <p className="text-xs text-purple-100 mt-1 max-w-xl">
                {language === 'en'
                  ? 'Select any unit or lesson, and Gemini will craft targeted multiple-choice questions with instant corrections and explanations.'
                  : 'اختر أي وحدة أو درس في المنهج وسيولد الذكاء الاصطناعي اختباراً تفاعلياً مصحوباً بالشروحات والتصحيح الفوري وحساب الدرجات.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-white/10 p-3 rounded-2xl backdrop-blur-md shrink-0">
              <select
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  const u = book.units.find(unit => unit.id === e.target.value);
                  if (u && u.lessons.length > 0) {
                    setSelectedLessonId(u.lessons[0].id);
                  }
                }}
                className="px-3 py-2 text-xs rounded-xl bg-white text-gray-900 font-medium focus:outline-none"
              >
                {book.units.map(u => (
                  <option key={u.id} value={u.id}>{u.title}</option>
                ))}
              </select>

              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-white text-gray-900 font-medium focus:outline-none"
              >
                {currentUnit?.lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>

              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 3)}
                className="px-3 py-2 text-xs rounded-xl bg-white text-gray-900 font-medium focus:outline-none"
              >
                <option value={3}>3 أسئلة</option>
                <option value={5}>5 أسئلة</option>
                <option value={10}>10 أسئلة</option>
              </select>

              <button
                onClick={handleGenerateQuiz}
                disabled={generating}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                <span>{generating ? (language === 'en' ? 'Generating...' : 'جاري التوليد...') : (language === 'en' ? 'Generate Quiz' : 'توليد الاختبار')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz Taking Interface */}
      {activeQuiz ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-md space-y-6">
          {/* Quiz Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                {activeQuiz.unitTitle} ➔ {activeQuiz.lessonTitle}
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                {activeQuiz.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {showResults && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>النتيجة: {activeQuiz.score} / {activeQuiz.totalQuestions}</span>
                </div>
              )}
              <button
                onClick={() => {
                  setActiveQuiz(null);
                  setSelectedAnswers({});
                  setShowResults(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
              >
                {language === 'en' ? 'Close' : 'إغلاق الاختبار'}
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {activeQuiz.questions.map((q, qIdx) => {
              const qKey = q.id || `q-${qIdx}`;
              const selectedOpt = selectedAnswers[qKey];
              const isCorrect = selectedOpt === q.correctAnswer;

              return (
                <div
                  key={qKey}
                  className={`p-5 rounded-2xl border transition-all ${
                    showResults
                      ? isCorrect
                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20'
                        : 'border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {qIdx + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {q.question}
                      </h4>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isThisSelected = selectedOpt === optIdx;
                          const isThisCorrectAnswer = q.correctAnswer === optIdx;

                          let btnClasses = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-purple-300';
                          if (showResults) {
                            if (isThisCorrectAnswer) {
                              btnClasses = 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200 font-bold';
                            } else if (isThisSelected && !isThisCorrectAnswer) {
                              btnClasses = 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200 line-through';
                            }
                          } else if (isThisSelected) {
                            btnClasses = 'border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950/50 dark:text-purple-200 font-bold shadow-xs';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectOption(qKey, optIdx)}
                              className={`p-3 rounded-xl border text-xs text-right flex items-center justify-between transition-all ${btnClasses}`}
                            >
                              <span>{opt}</span>
                              {showResults && isThisCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {showResults && isThisSelected && !isThisCorrectAnswer && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation on submit */}
                      {showResults && q.explanation && (
                        <div className="mt-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-xl text-xs text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                          <span className="font-bold text-purple-600 dark:text-purple-400">توضيح الإجابة: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit / Retry Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => {
                setActiveQuiz(null);
                setSelectedAnswers({});
                setShowResults(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {language === 'en' ? 'Back to list' : 'الرجوع للقائمة'}
            </button>

            {!showResults ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {language === 'en' ? 'Submit Answers' : 'تسليم الإجابات وعرض النتيجة'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedAnswers({});
                  setShowResults(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'en' ? 'Retry Quiz' : 'إعادة حل الاختبار'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Saved Quizzes History */
        <div className="space-y-3">
          <h4 className="font-bold text-gray-900 dark:text-white text-sm">
            {language === 'en' ? 'Saved Quizzes & Self-Tests' : 'سجل الاختبارات التدريبية السابقة'}
          </h4>

          {filteredQuizzes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Brain className="w-10 h-10 text-purple-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'en' ? 'No practice quizzes yet. Click Generate Quiz above to test your skills!' : 'لم تقم بتوليد أي اختبار تدريبي بعد. اختر درساً من الأعلى واضغط توليد الاختبار!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      {quiz.lessonTitle || quiz.unitTitle || book.subject}
                    </span>
                    <h5 className="font-bold text-gray-900 dark:text-white text-xs truncate">
                      {quiz.title}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{quiz.totalQuestions} أسئلة</span>
                      {quiz.isCompleted && quiz.score !== undefined && (
                        <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          الدرجة: {quiz.score}/{quiz.totalQuestions}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveQuiz(quiz);
                      setSelectedAnswers({});
                      setShowResults(quiz.isCompleted || false);
                    }}
                    className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shrink-0 font-bold text-xs flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{quiz.isCompleted ? 'مراجعة' : 'بدء'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
