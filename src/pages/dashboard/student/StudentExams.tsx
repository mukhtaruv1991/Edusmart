import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { FileText, Search, Calendar, Clock, CheckCircle, BookOpen } from 'lucide-react';
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
  type: 'quiz' | 'midterm' | 'final';
}

interface StudentExamsProps {
  type: 'school' | 'private';
}

export default function StudentExams({ type }: StudentExamsProps) {
  const { user, language } = useStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user?.uid || !user?.school) return;

    // For school exams, we fetch exams for the student's school and class
    // For private exams, we would fetch exams specifically assigned to the student
    // Here we'll just use a simple query for demonstration
    const q = query(
      collection(db, 'exams'),
      where('school', '==', user.school)
      // In a real app, add: where('classId', '==', user.classId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExams: Exam[] = [];
      snapshot.forEach((doc) => {
        fetchedExams.push({ id: doc.id, ...doc.data() } as Exam);
      });
      
      // Filter based on type if needed (simulated here)
      const filteredByType = type === 'school' 
        ? fetchedExams 
        : fetchedExams.filter(e => e.type === 'quiz'); // Just an example filter for private
        
      setExams(filteredByType);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching exams:', error);
      toast.error(language === 'en' ? 'Failed to load exams' : 'فشل في تحميل الاختبارات');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language, type]);

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
            {type === 'school' 
              ? (language === 'en' ? 'School Exams' : 'الاختبارات المدرسية')
              : (language === 'en' ? 'My Private Exams' : 'اختباراتي الخاصة')
            }
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {type === 'school'
              ? (language === 'en' ? 'View your upcoming and past school exams' : 'عرض اختباراتك المدرسية القادمة والسابقة')
              : (language === 'en' ? 'View your private assessments and quizzes' : 'عرض تقييماتك واختباراتك الخاصة')
            }
          </p>
        </div>
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

                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    disabled={exam.status !== 'ongoing'}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      exam.status === 'ongoing'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {exam.status === 'completed' 
                        ? (language === 'en' ? 'View Results' : 'عرض النتائج')
                        : exam.status === 'ongoing'
                          ? (language === 'en' ? 'Start Exam' : 'بدء الاختبار')
                          : (language === 'en' ? 'Not Available Yet' : 'غير متاح بعد')
                      }
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
