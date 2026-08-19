import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GraduationCap, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SCHOOL_SYSTEMS, GRADES } from '../../../lib/constants';

interface Class {
  id: string;
  name: string;
  grade: string;
  system: string;
  studentCount: number;
}

export default function ClassesManagement() {
  const { user, language } = useStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [newClassName, setNewClassName] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'classes'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses: Class[] = [];
      snapshot.forEach((doc) => {
        fetchedClasses.push({ id: doc.id, ...doc.data() } as Class);
      });
      setClasses(fetchedClasses);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching classes:', error);
      toast.error(language === 'en' ? 'Failed to load classes' : 'فشل في تحميل الصفوف');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school) return;

    try {
      await addDoc(collection(db, 'classes'), {
        name: newClassName,
        system: selectedSystem,
        grade: selectedGrade,
        school: user.school,
        studentCount: 0,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'en' ? 'Class added successfully' : 'تم إضافة الصف بنجاح');
      setIsAdding(false);
      setNewClassName('');
      setSelectedSystem('');
      setSelectedGrade('');
    } catch (error) {
      console.error('Error adding class:', error);
      toast.error(language === 'en' ? 'Failed to add class' : 'فشل في إضافة الصف');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this class?' : 'هل أنت متأكد أنك تريد حذف هذا الصف؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'classes', classId));
      toast.success(language === 'en' ? 'Class deleted successfully' : 'تم حذف الصف بنجاح');
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error(language === 'en' ? 'Failed to delete class' : 'فشل في حذف الصف');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Classes & Departments' : 'الصفوف والأقسام'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage classes in your school' : 'إدارة الصفوف في مدرستك'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Add Class' : 'إضافة صف'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {language === 'en' ? 'Add New Class' : 'إضافة صف جديد'}
          </h2>
          <form onSubmit={handleAddClass} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'School System' : 'النظام الدراسي'}
                </label>
                <select
                  required
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">{language === 'en' ? 'Select System' : 'اختر النظام'}</option>
                  {SCHOOL_SYSTEMS.map(sys => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Grade' : 'المرحلة الدراسية'}
                </label>
                <select
                  required
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">{language === 'en' ? 'Select Grade' : 'اختر المرحلة'}</option>
                  {GRADES.map(grade => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Class Name/Section' : 'اسم الصف/الشعبة'}
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., Section A' : 'مثال: شعبة أ'}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'en' ? 'Save Class' : 'حفظ الصف'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading classes...' : 'جاري تحميل الصفوف...'}
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No classes found. Add your first class.' : 'لم يتم العثور على صفوف. أضف صفك الأول.'}</p>
          </div>
        ) : (
          classes.map((cls) => {
            const system = cls.system;
            const grade = cls.grade;

            return (
              <div key={cls.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {grade} - {cls.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {system}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteClass(cls.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {cls.studentCount || 0} {language === 'en' ? 'Students' : 'طالب'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
