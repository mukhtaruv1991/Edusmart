import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, GraduationCap, MessageSquare, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';

interface Child {
  uid: string;
  name: string;
  grade?: string;
  school?: string;
  status?: 'active' | 'inactive';
  average: number;
  examsCount: number;
  competitionsCount: number;
}

interface Attempt { percentage?: number; score?: number; total?: number; }
const percentage = (item: Attempt) => typeof item.percentage === 'number' ? item.percentage : item.total ? Math.round(((item.score || 0) / item.total) * 100) : 0;

export default function ParentChildren() {
  const { user, language } = useStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('parentId', '==', user.uid));
    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      try {
        const result = await Promise.all(snapshot.docs.map(async (student) => {
          const examsSnapshot = await getDocs(query(collection(db, 'examAttempts'), where('studentId', '==', student.id)));
          const competitionsSnapshot = await getDocs(query(collection(db, 'competitionAttempts'), where('studentId', '==', student.id)));
          const attempts = examsSnapshot.docs.map((item) => item.data() as Attempt);
          const average = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + percentage(item), 0) / attempts.length) : 0;
          const data = student.data();
          return { uid: student.id, name: data.name || data.email || (language === 'ar' ? 'طالب' : 'Student'), grade: data.grade, school: data.school, status: data.status || 'active', average, examsCount: attempts.length, competitionsCount: competitionsSnapshot.size } as Child;
        }));
        if (active) setChildren(result);
      } catch (error) {
        console.error('Error loading child performance:', error);
        if (active) toast.error(language === 'ar' ? 'تعذر تحميل أداء الأبناء' : 'Failed to load children performance');
      } finally {
        if (active) setLoading(false);
      }
    }, (error) => {
      console.error('Error fetching children:', error);
      toast.error(language === 'ar' ? 'فشل في تحميل بيانات الأبناء' : 'Failed to load children data');
      setLoading(false);
    });
    return () => { active = false; unsubscribe(); };
  }, [language, user?.uid]);

  return <div className="space-y-6"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><Users className="h-6 w-6 text-blue-600" />{language === 'en' ? 'My children' : 'أبنائي'}</h1><p className="mt-1 text-gray-500 dark:text-gray-400">{language === 'en' ? 'Live academic progress and school communication' : 'متابعة الأداء الدراسي والتواصل مع المدرسة'}</p></div><Link to="/parent/chats" className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><MessageSquare className="h-4 w-4" />{language === 'ar' ? 'التواصل مع المدرسة' : 'Contact school'}</Link></div>
    {loading ? <div className="py-10 text-center text-gray-500">{language === 'ar' ? 'جاري تحميل بيانات الأبناء...' : 'Loading children data...'}</div> : children.length === 0 ? <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800"><Users className="mx-auto mb-3 h-12 w-12 opacity-30" /><p>{language === 'ar' ? 'لم يتم ربط أبناء بهذا الحساب بعد.' : 'No children are linked to this account yet.'}</p><p className="mt-2 text-xs">{language === 'ar' ? 'يجب أن يحتوي حساب الطالب على parentId يساوي معرف ولي الأمر.' : 'The student account must have a parentId matching this parent account.'}</p></div> : <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{children.map((child) => <article key={child.uid} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center gap-4 border-b border-gray-100 p-6 dark:border-gray-700"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">{child.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-xl font-bold text-gray-900 dark:text-white">{child.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><GraduationCap className="h-4 w-4" />{child.grade || (language === 'ar' ? 'الصف غير محدد' : 'Grade not set')}</p><p className="truncate text-xs text-gray-400">{child.school || '-'}</p></div></div><div className="grid grid-cols-3 gap-3 p-6"><Stat icon={<Activity className="h-5 w-5" />} label={language === 'ar' ? 'المعدل' : 'Average'} value={`${child.average}%`} /><Stat icon={<BookOpen className="h-5 w-5" />} label={language === 'ar' ? 'اختبارات' : 'Exams'} value={`${child.examsCount}`} /><Stat icon={<Trophy className="h-5 w-5" />} label={language === 'ar' ? 'مسابقات' : 'Competitions'} value={`${child.competitionsCount}`} /></div><div className="flex gap-3 border-t border-gray-100 p-4 dark:border-gray-700"><Link to="/parent/tracking" className="flex-1 rounded-xl bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700/50 dark:text-gray-200">{language === 'ar' ? 'التقدم الدراسي' : 'Progress'}</Link><Link to="/parent/chats" className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300">{language === 'ar' ? 'التواصل' : 'Message'}</Link></div></article>)}</div>}
  </div>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-700/50"><div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-gray-800">{icon}</div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-bold text-gray-900 dark:text-white">{value}</p></div>; }
