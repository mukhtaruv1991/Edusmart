import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { FileText, Plus, Search, Edit2, Trash2, Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctOption: number;
  points: number;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  classId: string;
  date: any;
  duration: number;
  totalMarks: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  type: 'quiz' | 'monthly' | 'midterm' | 'final';
  questions?: ExamQuestion[];
}

export default function TeacherExams() {
  const { user, language } = useStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [type, setType] = useState<'quiz' | 'monthly' | 'midterm' | 'final'>('quiz');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [questionPoints, setQuestionPoints] = useState(1);

  useEffect(() => {
    if (!user?.uid || (!user?.schoolId && !user?.school)) return;

    const schoolValue = user.schoolId || user.school;
    const schoolField = 'schoolId';
    const q = query(
      collection(db, 'examSchedules'),
      where('schoolId', '==', schoolValue),
      where('teacherIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExams: Exam[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const scheduledAt = data.scheduledAt || data.date;
        fetchedExams.push({
          id: doc.id,
          ...data,
          subject: data.subject || data.subjectKey || '',
          type: data.type || data.examType || 'quiz',
          duration: data.duration || data.durationMinutes || 60,
          date: scheduledAt,
        } as Exam);
      });
      setExams(fetchedExams);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching exams:', error);
      toast.error(language === 'en' ? 'Failed to load exams' : 'فشل في تحميل الاختبارات');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || (!user?.schoolId && !user?.school)) return;

    try {
      const schoolId = user.schoolId || user.school || '';
      const examData = {
        title: title.trim(),
        subjectKey: subject.trim(),
        subject: subject.trim(),
        classId,
        scheduledAt: new Date(date),
        durationMinutes: duration,
        duration,
        totalMarks,
        examType: type,
        type,
        status: 'upcoming',
        teacherIds: [user.uid],
        createdBy: user.uid,
        schoolId,
        school: user.school || schoolId,
        questions: questions.map(({ correctOption: _correctOption, ...question }) => question),
        updatedAt: serverTimestamp(),
      };

      const scheduleRef = editingExam
        ? doc(db, 'examSchedules', editingExam.id)
        : doc(collection(db, 'examSchedules'));
      await setDoc(scheduleRef, { ...examData, ...(editingExam ? {} : { createdAt: serverTimestamp() }) }, { merge: Boolean(editingExam) });
      await setDoc(doc(db, 'examAnswerKeys', scheduleRef.id), {
        examId: scheduleRef.id,
        schoolId,
        createdBy: user.uid,
        answers: questions.map((question) => ({ questionId: question.id, correctOption: question.correctOption, points: question.points })),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success(editingExam ? (language === 'en' ? 'Exam updated successfully' : 'تم تحديث الاختبار بنجاح') : (language === 'en' ? 'Exam created successfully' : 'تم إنشاء الاختبار بنجاح'));

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error(language === 'en' ? 'Failed to save exam' : 'فشل في حفظ الاختبار');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(language === 'en' ? 'Are you sure you want to delete this exam?' : 'هل أنت متأكد من حذف هذا الاختبار؟')) {
      try {
        await deleteDoc(doc(db, 'examSchedules', id));
        toast.success(language === 'en' ? 'Exam deleted successfully' : 'تم حذف الاختبار بنجاح');
      } catch (error) {
        console.error('Error deleting exam:', error);
        toast.error(language === 'en' ? 'Failed to delete exam' : 'فشل في حذف الاختبار');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setClassId('');
    setDate('');
    setDuration(60);
    setTotalMarks(100);
    setType('quiz');
    setQuestions([]);
    setQuestionPrompt('');
    setQuestionOptions(['', '', '', '']);
    setCorrectOption(0);
    setQuestionPoints(1);
    setEditingExam(null);
  };

  const openEditModal = async (exam: Exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setSubject(exam.subject);
    setClassId(exam.classId);
    // Format date for input type="datetime-local"
    const examDate = exam.date?.toDate ? exam.date.toDate() : new Date(exam.date);
    const formattedDate = examDate.toISOString().slice(0, 16);
    setDate(formattedDate);
    setDuration(exam.duration);
    setTotalMarks(exam.totalMarks);
    setType(exam.type);
    const answerKeySnapshot = await getDoc(doc(db, 'examAnswerKeys', exam.id));
    const answerKey = answerKeySnapshot.exists() ? (answerKeySnapshot.data().answers || []) as Array<{ questionId: string; correctOption: number; points: number }> : [];
    const answerById = new Map(answerKey.map((answer) => [answer.questionId, answer]));
    setQuestions((exam.questions || []).map((question, index) => ({
      ...question,
      correctOption: answerById.get(question.id)?.correctOption ?? index % Math.max(question.options.length, 1),
      points: answerById.get(question.id)?.points ?? question.points ?? 1,
    })));
    setIsModalOpen(true);
  };

  const handleAddQuestion = () => {
    const prompt = questionPrompt.trim();
    const options = questionOptions.map((option) => option.trim()).filter(Boolean);
    if (!prompt || options.length < 2) {
      toast.error(language === 'en' ? 'Add a question and at least two options.' : 'أدخل نص السؤال وخيارين على الأقل.');
      return;
    }
    if (correctOption >= options.length) setCorrectOption(0);
    setQuestions((current) => [...current, {
      id: `q-${Date.now()}-${current.length}`,
      prompt,
      options,
      correctOption: Math.min(correctOption, options.length - 1),
      points: Math.max(1, questionPoints),
    }]);
    setQuestionPrompt('');
    setQuestionOptions(['', '', '', '']);
    setCorrectOption(0);
    setQuestionPoints(1);
  };

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Exams Management' : 'إدارة الاختبارات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Create and manage your class exams' : 'إنشاء وإدارة اختبارات فصولك'}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Create Exam' : 'إنشاء اختبار'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search exams...' : 'البحث في الاختبارات...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading exams...' : 'جاري تحميل الاختبارات...'}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No exams found.' : 'لم يتم العثور على اختبارات.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 p-5 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{exam.title}</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{exam.subject}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    exam.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    exam.status === 'ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {exam.status === 'upcoming' ? (language === 'en' ? 'Upcoming' : 'قادم') :
                     exam.status === 'ongoing' ? (language === 'en' ? 'Ongoing' : 'جاري') :
                     (language === 'en' ? 'Completed' : 'مكتمل')}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>{exam.date?.toDate ? exam.date.toDate().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA') : new Date(exam.date).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{exam.duration} {language === 'en' ? 'mins' : 'دقيقة'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>{exam.totalMarks} {language === 'en' ? 'Marks' : 'درجة'}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(exam)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingExam 
                  ? (language === 'en' ? 'Edit Exam' : 'تعديل الاختبار')
                  : (language === 'en' ? 'Create New Exam' : 'إنشاء اختبار جديد')
                }
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Exam Title' : 'عنوان الاختبار'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Subject' : 'المادة'}
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'en' ? 'Type' : 'النوع'}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="quiz">{language === 'en' ? 'Quiz' : 'اختبار قصير'}</option>
                    <option value="monthly">{language === 'en' ? 'Monthly' : 'شهري'}</option>
                    <option value="midterm">{language === 'en' ? 'Midterm' : 'نصفي'}</option>
                    <option value="final">{language === 'en' ? 'Final' : 'نهائي'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'en' ? 'Total Marks' : 'الدرجة الكلية'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Date & Time' : 'التاريخ والوقت'}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Duration (Minutes)' : 'المدة (بالدقائق)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">أسئلة الاختبار</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">تُحفظ الأسئلة للطالب، بينما يُحفظ مفتاح الإجابة في مجموعة محمية.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-gray-800 dark:text-blue-300">{questions.length} سؤال</span>
                </div>
                {questions.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {questions.map((question, index) => (
                      <div key={question.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm dark:bg-gray-800">
                        <div><span className="font-semibold text-blue-600">{index + 1}.</span> <span className="text-gray-800 dark:text-gray-100">{question.prompt}</span><p className="mt-1 text-xs text-gray-500">{question.options.length} خيارات · {question.points} درجة</p></div>
                        <button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="حذف السؤال"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea value={questionPrompt} onChange={(event) => setQuestionPrompt(event.target.value)} rows={2} placeholder="نص السؤال" className="mb-2 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {questionOptions.map((option, index) => <input key={index} value={option} onChange={(event) => setQuestionOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`الخيار ${index + 1}`} className="rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />)}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">الإجابة الصحيحة<select value={correctOption} onChange={(event) => setCorrectOption(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">{questionOptions.map((_, index) => <option key={index} value={index}>الخيار {index + 1}</option>)}</select></label>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">الدرجة<input type="number" min="1" value={questionPoints} onChange={(event) => setQuestionPoints(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></label>
                </div>
                <button type="button" onClick={handleAddQuestion} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300"><Plus className="h-4 w-4" /> إضافة السؤال</button>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingExam 
                    ? (language === 'en' ? 'Save Changes' : 'حفظ التغييرات')
                    : (language === 'en' ? 'Create Exam' : 'إنشاء الاختبار')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
