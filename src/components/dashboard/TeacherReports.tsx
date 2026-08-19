import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BarChart, Users, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherReports() {
  const { user, language } = useStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentProgress(selectedClass);
    } else {
      setStudentsData([]);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    if (!user) return;
    try {
      let fetchedClasses: any[] = [];
      
      if (user.role === 'principal' && user.school) {
        // Fetch teachers in the same school
        const teachersQ = query(collection(db, 'users'), where('school', '==', user.school), where('role', '==', 'teacher'));
        const teachersSnapshot = await getDocs(teachersQ);
        const teacherIds = teachersSnapshot.docs.map(doc => doc.id);
        
        if (teacherIds.length > 0) {
          // Chunk teacherIds to avoid 'in' query limit
          const chunks = [];
          for (let i = 0; i < teacherIds.length; i += 10) {
            chunks.push(teacherIds.slice(i, i + 10));
          }
          
          for (const chunk of chunks) {
            const classQ = query(collection(db, 'classes'), where('teacherId', 'in', chunk));
            const classSnapshot = await getDocs(classQ);
            fetchedClasses.push(...classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
      } else {
        const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
        const snapshot = await getDocs(q);
        fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      setClasses(fetchedClasses);
      if (fetchedClasses.length > 0) {
        setSelectedClass(fetchedClasses[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(language === 'en' ? 'Failed to fetch classes' : 'فشل في جلب الفصول');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async (classId: string) => {
    setLoading(true);
    try {
      const classDoc = classes.find(c => c.id === classId);
      if (!classDoc || !classDoc.students || classDoc.students.length === 0) {
        setStudentsData([]);
        setLoading(false);
        return;
      }

      // Fetch student details in chunks of 10 to avoid Firestore 'in' query limit
      const students: any[] = [];
      for (let i = 0; i < classDoc.students.length; i += 10) {
        const chunk = classDoc.students.slice(i, i + 10);
        const studentsQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
        const studentsSnapshot = await getDocs(studentsQuery);
        students.push(...studentsSnapshot.docs.map(doc => doc.data()));
      }

      // Fetch submissions for these students in chunks
      const submissions: any[] = [];
      for (let i = 0; i < classDoc.students.length; i += 10) {
        const chunk = classDoc.students.slice(i, i + 10);
        const submissionsQuery = query(collection(db, 'submissions'), where('studentId', 'in', chunk));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        submissions.push(...submissionsSnapshot.docs.map(doc => doc.data()));
      }

      const progressData = students.map(student => {
        const studentSubmissions = submissions.filter(s => s.studentId === student.uid);
        const totalExams = studentSubmissions.length;
        const averageScore = totalExams > 0 
          ? studentSubmissions.reduce((acc, curr) => acc + curr.score, 0) / totalExams 
          : 0;

        return {
          ...student,
          totalExams,
          averageScore: Math.round(averageScore),
          radar: averageScore > 80 ? 'Excellent' : averageScore > 60 ? 'Good' : 'Needs Improvement'
        };
      });

      setStudentsData(progressData);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast.error(language === 'en' ? 'Failed to fetch progress' : 'فشل في جلب التقدم');
    } finally {
      setLoading(false);
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart className="w-6 h-6 text-blue-600" />
          {language === 'en' ? 'Student Progress Reports' : 'تقارير تقدم الطلاب'}
        </h2>
        
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="" disabled>{language === 'en' ? 'Select a class' : 'اختر فصلاً'}</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : studentsData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'No students found in this class.' : 'لم يتم العثور على طلاب في هذا الفصل.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 font-medium text-gray-600 dark:text-gray-300">{language === 'en' ? 'Student Name' : 'اسم الطالب'}</th>
                  <th className="p-4 font-medium text-gray-600 dark:text-gray-300">{language === 'en' ? 'Exams Taken' : 'الامتحانات المنجزة'}</th>
                  <th className="p-4 font-medium text-gray-600 dark:text-gray-300">{language === 'en' ? 'Average Score' : 'متوسط الدرجات'}</th>
                  <th className="p-4 font-medium text-gray-600 dark:text-gray-300">{language === 'en' ? 'AI Radar' : 'رادار الذكاء الاصطناعي'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {studentsData.map((student) => (
                  <tr key={student.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{student.totalExams}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-[100px]">
                          <div 
                            className={`h-2.5 rounded-full ${student.averageScore >= 80 ? 'bg-green-500' : student.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${student.averageScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{student.averageScore}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        student.radar === 'Excellent' ? 'bg-green-100 text-green-800' :
                        student.radar === 'Good' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <Target className="w-3 h-3" />
                        {student.radar}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
