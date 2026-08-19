import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Users, GraduationCap, BookOpen, MapPin, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface Child {
  uid: string;
  name: string;
  grade: string;
  school: string;
  status: 'active' | 'inactive';
}

export default function ParentChildren() {
  const { user, language } = useStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // In a real app, there would be a relationship mapping parents to students
    // For now, we'll simulate fetching children by querying students with the same phone number
    // or a specific 'parentId' field. Let's assume we query by a parentId field.
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('parentId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Child[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ uid: doc.id, ...doc.data() } as Child);
      });
      
      // Add dummy data if none found for demonstration
      if (fetched.length === 0) {
        fetched.push(
          { uid: '1', name: 'Ahmed Ali', grade: 'Grade 10', school: user.school || 'Main School', status: 'active' },
          { uid: '2', name: 'Sara Ali', grade: 'Grade 8', school: user.school || 'Main School', status: 'active' }
        );
      }
      
      setChildren(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching children:', error);
      toast.error(language === 'en' ? 'Failed to load children data' : 'فشل في تحميل بيانات الأبناء');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'My Children' : 'أبنائي'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'View and track your children\'s progress' : 'عرض وتتبع تقدم أبنائك'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading children data...' : 'جاري تحميل بيانات الأبناء...'}
          </div>
        ) : children.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No children found.' : 'لم يتم العثور على أبناء.'}</p>
          </div>
        ) : (
          children.map((child) => (
            <div key={child.uid} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold">
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {child.name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <GraduationCap className="w-4 h-4" />
                    {child.grade}
                  </p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                  <Activity className="w-6 h-6 mb-2 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  <span className="text-sm font-medium">{language === 'en' ? 'Performance' : 'الأداء'}</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                  <BookOpen className="w-6 h-6 mb-2 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  <span className="text-sm font-medium">{language === 'en' ? 'Homework' : 'الواجبات'}</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                  <MapPin className="w-6 h-6 mb-2 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  <span className="text-sm font-medium">{language === 'en' ? 'Tracking' : 'التتبع'}</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
                  <Users className="w-6 h-6 mb-2 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  <span className="text-sm font-medium">{language === 'en' ? 'Teachers' : 'المعلمين'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
