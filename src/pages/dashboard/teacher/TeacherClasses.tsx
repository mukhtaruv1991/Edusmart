// Style: صفحة تشغيلية هادئة ضمن هوية EduSmart؛ تخطيط RTL واضح، بطاقات وظيفية، وألوان زرقاء تعليمية دون بيانات افتراضية.
import { useEffect, useState } from 'react';
import { useStore } from '../../../lib/store';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GraduationCap, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Class {
  id: string;
  name: string;
  grade: string;
  system?: string;
  teacherId?: string;
  teacherIds?: string[];
}

export default function TeacherClasses() {
  const { user, language } = useStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.school || !user?.uid) {
      setClasses([]);
      setLoading(false);
      return;
    }

    let active = true;
    const loadAssignedClasses = async () => {
      try {
        const classCollection = collection(db, 'classes');
        const [primarySnapshot, groupedSnapshot] = await Promise.all([
          getDocs(query(classCollection, where('school', '==', user.school), where('teacherId', '==', user.uid))),
          getDocs(query(classCollection, where('school', '==', user.school), where('teacherIds', 'array-contains', user.uid))),
        ]);
        const unique = new Map<string, Class>();
        [...primarySnapshot.docs, ...groupedSnapshot.docs].forEach((item) => {
          unique.set(item.id, { id: item.id, ...item.data() } as Class);
        });
        if (active) setClasses([...unique.values()]);
      } catch (error) {
        console.error('Error fetching assigned classes:', error);
        if (active) toast.error(language === 'en' ? 'Failed to load assigned classes' : 'فشل في تحميل الفصول المخصصة');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadAssignedClasses();
    return () => { active = false; };
  }, [user?.school, user?.uid, language]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><GraduationCap className="h-6 w-6 text-blue-600" />{language === 'en' ? 'My Classes' : 'فصولي'}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{language === 'en' ? 'View and manage your assigned classes' : 'عرض الفصول المخصصة لك فعليًا من إدارة المدرسة'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-8 text-center text-gray-500">{language === 'en' ? 'Loading classes...' : 'جاري تحميل الفصول...'}</div>
        ) : classes.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-100 bg-white py-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            <GraduationCap className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <p>{language === 'en' ? 'No classes have been assigned to your account.' : 'لم يتم تعيين أي فصل لحسابك بعد.'}</p>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="flex cursor-pointer flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><BookOpen className="h-6 w-6" /></div>
                <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">{cls.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{cls.grade}</p></div>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"><div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{language === 'en' ? 'Assigned class' : 'فصل مخصص'}</span></div><span className="text-xs text-gray-400">{cls.id.slice(0, 8)}</span></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
