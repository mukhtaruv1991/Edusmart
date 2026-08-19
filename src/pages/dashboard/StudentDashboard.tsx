import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { BookOpen, FileText, Award, Target, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import PDFReader from '../../components/ai/PDFReader';
import StudentExams from '../../components/dashboard/StudentExams';
import Chatrooms from '../../components/dashboard/Chatrooms';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export default function StudentDashboard() {
  const { user, language } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [readingBook, setReadingBook] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, [user]);

  const fetchBooks = async () => {
    if (!user || !user.grade) {
      setLoadingBooks(false);
      return;
    }
    try {
      const q = query(collection(db, 'books'), where('grade', '==', user.grade));
      const snapshot = await getDocs(q);
      const fetchedBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBooks(fetchedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoadingBooks(false);
    }
  };

  if (readingBook) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <button 
          onClick={() => setReadingBook(null)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'en' ? 'Back to Dashboard' : 'العودة للوحة القيادة'}
        </button>
        <PDFReader book={readingBook} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {language === 'en' ? 'Overview' : 'نظرة عامة'}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'chat' 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {language === 'en' ? 'Class Chats' : 'محادثات الفصول'}
        </button>
      </div>

      {activeTab === 'chat' ? (
        <Chatrooms />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'My Books' : 'كتبي'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{books.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Pending Exams' : 'امتحانات معلقة'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Average Score' : 'متوسط الدرجات'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'AI Radar' : 'رادار الذكاء الاصطناعي'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">Good</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {language === 'en' ? 'Interactive Library' : 'المكتبة التفاعلية'}
          </h2>
          {loadingBooks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {language === 'en' ? 'No books available for your grade yet.' : 'لا توجد كتب متاحة لصفك الدراسي بعد.'}
            </div>
          ) : (
            <div className="space-y-4">
              {books.map(book => (
                <div 
                  key={book.id}
                  onClick={() => setReadingBook(book)}
                  className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-blue-100 rounded flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{book.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{book.subject}</p>
                    </div>
                  </div>
                  <button className="text-blue-600 text-sm font-medium hover:underline">
                    {language === 'en' ? 'Read & Interact' : 'اقرأ وتفاعل'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

          <StudentExams />
        </div>
      </>
      )}
    </div>
  );
}
