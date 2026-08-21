import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { FileText, Plus, Search, Edit2, Trash2, Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (!user?.uid || (!user?.schoolId && !user?.school)) return;

    const schoolField = user.schoolId ? 'schoolId' : 'school';
    const schoolValue = user.schoolId || user.school;
    const q = query(
      collection(db, 'exams'),
      where(schoolField, '==', schoolValue),
      where('teacherId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExams: Exam[] = [];
      snapshot.forEach((doc) => {
        fetchedExams.push({ id: doc.id, ...doc.data() } as Exam);
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
      const examData = {
        title,
        subject,
        classId,
        date: new Date(date),
        duration,
        totalMarks,
        type,
        status: 'upcoming',
        teacherId: user.uid,
        school: user.school || '',
        schoolId: user.schoolId || '',
        questions: [],
        updatedAt: serverTimestamp(),
      };

      if (editingExam) {
        await updateDoc(doc(db, 'exams', editingExam.id), examData);
        toast.success(language === 'en' ? 'Exam updated successfully' : 'تم تحديث الاختبار بنجاح');
      } else {
        await addDoc(collection(db, 'exams'), {
          ...examData,
          createdAt: serverTimestamp(),
        });
        toast.success(language === 'en' ? 'Exam created successfully' : 'تم إنشاء الاختبار بنجاح');
      }

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
        await deleteDoc(doc(db, 'exams', id));
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
    setEditingExam(null);
  };

  const openEditModal = (exam: Exam) => {
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
    setIsModalOpen(true);
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
