import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { BookOpen, FileText, Award, Target, ArrowLeft, Loader2, MessageSquare, Sparkles, Brain, ArrowRight } from 'lucide-react';
import StudentExams from '../../components/dashboard/StudentExams';
import ChatInterface from '../../components/chat/ChatInterface';
import { getCurriculumBooksForGrade } from '../../lib/curriculumData';
import { getLocalStudyItems, getLocalQuizzes } from '../../lib/studyStorage';
import InteractiveReader from '../../components/curriculum/InteractiveReader';
import { CurriculumBook } from '../../types/curriculum';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function StudentDashboard() {
  const { user, language } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [readingBook, setReadingBook] = useState<CurriculumBook | null>(null);
  const [books, setBooks] = useState<CurriculumBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [savedNotesCount, setSavedNotesCount] = useState(0);
  const [quizzesCount, setQuizzesCount] = useState(0);

  useEffect(() => {
    fetchBooks();
    if (user?.uid) {
      const items = getLocalStudyItems(user.uid);
      setSavedNotesCount(items.length);
      const qz = getLocalQuizzes(user.uid);
      setQuizzesCount(qz.length);
    }
  }, [user]);

  const fetchBooks = async () => {
    const defaultGrade = user?.grade || 'الصف الثالث الثانوي (العلمي)';
    const localCurricula = getCurriculumBooksForGrade(defaultGrade);

    try {
      if (user?.grade && db) {
        const q = query(collection(db, 'books'), where('grade', '==', user.grade));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const remoteBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CurriculumBook));
          setBooks(remoteBooks);
          setLoadingBooks(false);
          return;
        }
      }
      setBooks(localCurricula);
    } catch (error) {
      console.warn('Silent fallback to local curriculum database:', error);
      setBooks(localCurricula);
    } finally {
      setLoadingBooks(false);
    }
  };

  if (readingBook) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <button 
          onClick={() => setReadingBook(null)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors w-fit text-xs font-semibold shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{language === 'en' ? 'Back to Dashboard' : 'العودة للوحة القيادة'}</span>
        </button>
        <InteractiveReader book={readingBook} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium rounded-xl transition-colors whitespace-nowrap text-xs sm:text-sm ${
            activeTab === 'overview' 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {language === 'en' ? 'Overview & Study Hub' : 'الرئيسية والمذاكرة الذكية'}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium rounded-xl transition-colors whitespace-nowrap text-xs sm:text-sm ${
            activeTab === 'chat' 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {language === 'en' ? 'School chats' : 'محادثات المدرسة'}
        </button>
      </div>

      {activeTab === 'chat' ? (
        <ChatInterface />
      ) : (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'My Curriculums' : 'المناهج المتاحة'}</p>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">{books.length} مواد</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'Saved AI Notes' : 'شروحاتي المحفوظة'}</p>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">{savedNotesCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-xl">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'Practice Quizzes' : 'اختباراتي الذاتية'}</p>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">{quizzesCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'AI Study Radar' : 'رادار المذاكرة'}</p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">جاهز 100%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Curriculum Library */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>{language === 'en' ? 'Interactive Curriculum Library' : 'المكتبة التفاعلية والمناهج'}</span>
                </h2>
                <span className="text-xs text-gray-400">
                  {user?.grade || 'الصف الثالث الثانوي (العلمي)'}
                </span>
              </div>

              {loadingBooks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : books.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                  {language === 'en' ? 'No books available for your grade yet.' : 'لا توجد كتب متاحة لصفك الدراسي بعد.'}
                </div>
              ) : (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {books.map(book => (
                    <div 
                      key={book.id}
                      onClick={() => setReadingBook(book)}
                      className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-blue-50/40 dark:hover:bg-gray-750 cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{book.title}</h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {book.subject} • {book.units?.length || 0} وحدات • {book.totalPageCount} صفحة
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <span>{language === 'en' ? 'Study' : 'مذاكرة'}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official School Exams */}
            <StudentExams />
          </div>
        </>
      )}
    </div>
  );
}
