import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { FileText, Loader2, CheckCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  title: string;
  classId: string;
  questions: any[];
  status: string;
  createdAt: string;
}

export default function StudentExams() {
  const { language } = useStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingExam, setTakingExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedExams, setSubmittedExams] = useState<string[]>([]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    if (!auth.currentUser) return;
    try {
      // 1. Get classes the student is in
      const classesQ = query(collection(db, 'classes'), where('students', 'array-contains', auth.currentUser.uid));
      const classesSnapshot = await getDocs(classesQ);
      const classIds = classesSnapshot.docs.map(doc => doc.id);

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Get published exams for those classes
      // Note: Firestore 'in' query limit is 10. We'll slice it for safety.
      const examChunks = [];
      for (let i = 0; i < classIds.length; i += 10) {
        examChunks.push(classIds.slice(i, i + 10));
      }

      let allExams: Exam[] = [];
      for (const chunk of examChunks) {
        const examsQ = query(collection(db, 'exams'), where('classId', 'in', chunk), where('status', '==', 'published'));
        const examsSnapshot = await getDocs(examsQ);
        const chunkExams = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Exam[];
        allExams = [...allExams, ...chunkExams];
      }
      setExams(allExams);

      // 3. Get student's submissions to know which exams are already taken
      const submissionsQ = query(collection(db, 'submissions'), where('studentId', '==', auth.currentUser.uid));
      const submissionsSnapshot = await getDocs(submissionsQ);
      const takenExamIds = submissionsSnapshot.docs.map(doc => doc.data().examId);
      setSubmittedExams(takenExamIds);

    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (exam: Exam) => {
    setTakingExam(exam);
    setAnswers({});
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitExam = async () => {
    if (!auth.currentUser || !takingExam) return;
    
    // Check if all questions are answered
    if (Object.keys(answers).length < takingExam.questions.length) {
      return toast.error(language === 'en' ? 'Please answer all questions' : 'الرجاء الإجابة على جميع الأسئلة');
    }

    setSubmitting(true);
    try {
      // Calculate score
      let correctCount = 0;
      const formattedAnswers = takingExam.questions.map((q, index) => {
        const studentAnswer = answers[index];
        const isCorrect = studentAnswer === q.correctAnswer;
        if (isCorrect) correctCount++;
        return {
          questionText: q.questionText,
          studentAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect
        };
      });

      const score = Math.round((correctCount / takingExam.questions.length) * 100);

      const submission = {
        id: crypto.randomUUID(),
        examId: takingExam.id,
        studentId: auth.currentUser.uid,
        answers: formattedAnswers,
        score,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'submissions'), submission);
      
      toast.success(language === 'en' ? 'Exam submitted successfully!' : 'تم تسليم الامتحان بنجاح!');
      setSubmittedExams([...submittedExams, takingExam.id]);
      setTakingExam(null);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(language === 'en' ? 'Failed to submit exam' : 'فشل تسليم الامتحان');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (takingExam) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 max-w-3xl mx-auto">
        <div className="mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{takingExam.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {takingExam.questions.length} {language === 'en' ? 'Questions' : 'أسئلة'}
          </p>
        </div>

        <div className="space-y-8">
          {takingExam.questions.map((q, index) => (
            <div key={index} className="space-y-4">
              <p className="font-medium text-gray-900 dark:text-white text-lg">
                {index + 1}. {q.questionText}
              </p>
              
              {q.type === 'mcq' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                  {q.options.map((opt: string, i: number) => (
                    <label key={i} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${answers[index] === opt ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                      <input 
                        type="radio" 
                        name={`question-${index}`} 
                        value={opt}
                        checked={answers[index] === opt}
                        onChange={() => handleAnswerChange(index, opt)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'tf' && (
                <div className="flex gap-4 pl-4">
                  {['True', 'False'].map((opt) => {
                    const displayOpt = language === 'en' ? opt : (opt === 'True' ? 'صح' : 'خطأ');
                    return (
                      <label key={opt} className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${answers[index] === opt ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <input 
                          type="radio" 
                          name={`question-${index}`} 
                          value={opt}
                          checked={answers[index] === opt}
                          onChange={() => handleAnswerChange(index, opt)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{displayOpt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-end gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
          <button
            onClick={() => {
              if(confirm(language === 'en' ? 'Are you sure you want to cancel? Your progress will be lost.' : 'هل أنت متأكد من الإلغاء؟ سيتم فقدان تقدمك.')) {
                setTakingExam(null);
              }
            }}
            className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {language === 'en' ? 'Cancel' : 'إلغاء'}
          </button>
          <button
            onClick={handleSubmitExam}
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {language === 'en' ? 'Submit Exam' : 'تسليم الامتحان'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        {language === 'en' ? 'My Exams' : 'امتحاناتي'}
      </h2>
      
      {exams.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {language === 'en' ? 'No exams available right now.' : 'لا توجد امتحانات متاحة حالياً.'}
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map(exam => {
            const isSubmitted = submittedExams.includes(exam.id);
            return (
              <div key={exam.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{exam.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {exam.questions.length} {language === 'en' ? 'Questions' : 'أسئلة'}
                  </p>
                </div>
                {isSubmitted ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{language === 'en' ? 'Completed' : 'مكتمل'}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleStartExam(exam)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {language === 'en' ? 'Start Exam' : 'ابدأ الامتحان'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
