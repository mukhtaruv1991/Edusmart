import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { BookOpen, Users, Loader2, BarChart, Settings2 } from 'lucide-react';
import LibraryManagement from '../../components/dashboard/LibraryManagement';
import TeacherReports from '../../components/dashboard/TeacherReports';
import PrincipalSchoolManagement from '../../components/dashboard/PrincipalSchoolManagement';
import PrincipalAcademicControls from '../../components/dashboard/PrincipalAcademicControls';

export default function PrincipalDashboard() {
  const { user, language } = useStore();
  const [stats, setStats] = useState({ teachers: 0, students: 0, books: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'reports' | 'management' | 'academic'>('management');

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user || (!user.schoolId && !user.school)) {
      setLoading(false);
      return;
    }

    try {
      // Fetch teachers in the same school
      const schoolField = user.schoolId ? 'schoolId' : 'school';
      const schoolValue = user.schoolId || user.school;
      const teachersQ = query(collection(db, 'users'), where(schoolField, '==', schoolValue), where('role', '==', 'teacher'));
      const teachersSnapshot = await getDocs(teachersQ);
      
      // Fetch students in the same school
      const studentsQ = query(collection(db, 'users'), where(schoolField, '==', schoolValue), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQ);

      // Fetch books (all books for now, or could be filtered by school if books had a school field)
      const booksSnapshot = await getDocs(collection(db, 'books'));

      setStats({
        teachers: teachersSnapshot.size,
        students: studentsSnapshot.size,
        books: booksSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Teachers' : 'إجمالي المعلمين'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.teachers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Students' : 'إجمالي الطلاب'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.students}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Books in Library' : 'الكتب في المكتبة'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.books}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('academic')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'academic'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {language === 'en' ? 'Academic Control' : 'التحكم الأكاديمي'}
          </div>
          {activeTab === 'academic' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'management'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            {language === 'en' ? 'School Management' : 'إدارة المدرسة'}
          </div>
          {activeTab === 'management' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'library'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {language === 'en' ? 'Library' : 'المكتبة'}
          </div>
          {activeTab === 'library' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'reports'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            {language === 'en' ? 'Reports' : 'التقارير'}
          </div>
          {activeTab === 'reports' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'management' ? <PrincipalSchoolManagement schoolId={user?.schoolId || ''} /> : activeTab === 'academic' ? <PrincipalAcademicControls schoolId={user?.schoolId || ''} /> : activeTab === 'library' ? <LibraryManagement /> : <TeacherReports />}
    </div>
  );
}
