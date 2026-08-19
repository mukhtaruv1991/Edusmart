import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BookOpen, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { GRADES } from '../../../lib/constants';

interface Curriculum {
  id: string;
  name: string;
  grade: string;
  description: string;
  fileUrl?: string;
}

export default function CurriculumsManagement() {
  const { user, language } = useStore();
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'curriculums'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Curriculum[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Curriculum);
      });
      setCurriculums(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching curriculums:', error);
      toast.error(language === 'en' ? 'Failed to load curriculums' : 'فشل في تحميل المناهج');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school) return;

    try {
      await addDoc(collection(db, 'curriculums'), {
        name,
        grade: selectedGrade,
        description,
        school: user.school,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'en' ? 'Curriculum added successfully' : 'تم إضافة المنهج بنجاح');
      setIsAdding(false);
      setName('');
      setSelectedGrade('');
      setDescription('');
    } catch (error) {
      console.error('Error adding curriculum:', error);
      toast.error(language === 'en' ? 'Failed to add curriculum' : 'فشل في إضافة المنهج');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this curriculum?' : 'هل أنت متأكد أنك تريد حذف هذا المنهج؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'curriculums', id));
      toast.success(language === 'en' ? 'Curriculum deleted successfully' : 'تم حذف المنهج بنجاح');
    } catch (error) {
      console.error('Error deleting curriculum:', error);
      toast.error(language === 'en' ? 'Failed to delete curriculum' : 'فشل في حذف المنهج');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Curriculums Management' : 'إدارة المناهج'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage curriculums and study materials' : 'إدارة المناهج والمواد الدراسية'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Add Curriculum' : 'إضافة منهج'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {language === 'en' ? 'Add New Curriculum' : 'إضافة منهج جديد'}
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Subject Name' : 'اسم المادة'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., Mathematics' : 'مثال: الرياضيات'}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'Description' : 'الوصف'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
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
                {language === 'en' ? 'Save Curriculum' : 'حفظ المنهج'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading curriculums...' : 'جاري تحميل المناهج...'}
          </div>
        ) : curriculums.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No curriculums found.' : 'لم يتم العثور على مناهج.'}</p>
          </div>
        ) : (
          curriculums.map((curr) => {
            const grade = curr.grade;

            return (
              <div key={curr.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {curr.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {grade}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(curr.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                  {curr.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
