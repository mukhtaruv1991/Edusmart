import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { BookOpen, FileText, Users, BarChart } from 'lucide-react';
import ExamGenerator from '../../components/ai/ExamGenerator';
import ClassManagement from '../../components/dashboard/ClassManagement';
import ChatInterface from '../../components/chat/ChatInterface';
import TeacherReports from '../../components/dashboard/TeacherReports';

export default function TeacherDashboard() {
  const { user, language } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'classes' | 'chat' | 'reports'>('overview');
  const [metrics, setMetrics] = useState({ students: 0, exams: 0, classes: 0 });

  useEffect(() => {
    if (!user?.uid) return;
    const loadMetrics = async () => {
      try {
        const schoolFilter = user.schoolId ? where('schoolId', '==', user.schoolId) : where('school', '==', user.school || '');
        const [studentsSnapshot, examsSnapshot, classesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'users'), schoolFilter, where('role', '==', 'student'))),
          getDocs(query(collection(db, 'exams'), where('teacherId', '==', user.uid))),
          getDocs(query(collection(db, 'classes'), where('teacherId', '==', user.uid))),
        ]);
        setMetrics({
          students: studentsSnapshot.size,
          exams: examsSnapshot.size,
          classes: classesSnapshot.size,
        });
      } catch (error) {
        console.error('Failed to load teacher metrics:', error);
      }
    };
    void loadMetrics();
  }, [user?.school, user?.schoolId, user?.uid]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Students' : 'إجمالي الطلاب'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.students}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Active Exams' : 'الامتحانات النشطة'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.exams}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Classes' : 'الفصول'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.classes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {language === 'en' ? 'Overview' : 'نظرة عامة'}
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'classes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {language === 'en' ? 'Class Management' : 'إدارة الفصول'}
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'exams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {language === 'en' ? 'AI Exam Generator' : 'مولد الامتحانات بالذكاء الاصطناعي'}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {language === 'en' ? 'School chats' : 'محادثات المدرسة'}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'reports' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            {language === 'en' ? 'Student Progress' : 'تقدم الطلاب'}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {language === 'en' ? 'Welcome to your dashboard' : 'مرحباً بك في لوحة القيادة'}
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {language === 'en' ? 'Select a tab above to manage your classes or create exams.' : 'حدد علامة تبويب أعلاه لإدارة فصولك أو إنشاء امتحانات.'}
              </p>
            </div>
          )}
          {activeTab === 'classes' && <ClassManagement />}
          {activeTab === 'exams' && <ExamGenerator />}
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'reports' && <TeacherReports />}
        </div>
      </div>
    </div>
  );
}
