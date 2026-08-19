import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GraduationCap, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Class {
  id: string;
  name: string;
  grade: string;
  system: string;
  teacherId?: string;
}

export default function TeacherClasses() {
  const { user, language } = useStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.school || !user?.uid) return;

    // In a real app, we would filter by teacherId or a junction table
    // For now, we'll just show all classes in the school or simulate assigned classes
    const q = query(
      collection(db, 'classes'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Class[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Class);
      });
      setClasses(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching classes:', error);
      toast.error(language === 'en' ? 'Failed to load classes' : 'فشل في تحميل الصفوف');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'My Classes' : 'فصولي'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'View and manage your assigned classes' : 'عرض وإدارة فصولك المخصصة'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading classes...' : 'جاري تحميل الفصول...'}
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No classes assigned.' : 'لم يتم تعيين فصول.'}</p>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {cls.grade}
                  </p>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{language === 'en' ? 'View Students' : 'عرض الطلاب'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
