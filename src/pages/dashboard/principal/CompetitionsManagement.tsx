import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Trophy, Plus, Trash2, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Competition {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'academic' | 'sports' | 'arts' | 'other';
  status: 'upcoming' | 'ongoing' | 'completed';
}

export default function CompetitionsManagement() {
  const { user, language } = useStore();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'academic' | 'sports' | 'arts' | 'other'>('academic');

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'competitions'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Competition[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Competition);
      });
      setCompetitions(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching competitions:', error);
      toast.error(language === 'en' ? 'Failed to load competitions' : 'فشل في تحميل المسابقات');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school) return;

    try {
      await addDoc(collection(db, 'competitions'), {
        title,
        description,
        startDate,
        endDate,
        type,
        status: 'upcoming',
        school: user.school,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'en' ? 'Competition added successfully' : 'تم إضافة المسابقة بنجاح');
      setIsAdding(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setType('academic');
    } catch (error) {
      console.error('Error adding competition:', error);
      toast.error(language === 'en' ? 'Failed to add competition' : 'فشل في إضافة المسابقة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this competition?' : 'هل أنت متأكد أنك تريد حذف هذه المسابقة؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'competitions', id));
      toast.success(language === 'en' ? 'Competition deleted successfully' : 'تم حذف المسابقة بنجاح');
    } catch (error) {
      console.error('Error deleting competition:', error);
      toast.error(language === 'en' ? 'Failed to delete competition' : 'فشل في حذف المسابقة');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming': return language === 'en' ? 'Upcoming' : 'قادمة';
      case 'ongoing': return language === 'en' ? 'Ongoing' : 'جارية';
      case 'completed': return language === 'en' ? 'Completed' : 'مكتملة';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Competitions' : 'المسابقات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage school competitions and events' : 'إدارة المسابقات والفعاليات المدرسية'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Add Competition' : 'إضافة مسابقة'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {language === 'en' ? 'Add New Competition' : 'إضافة مسابقة جديدة'}
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Title' : 'العنوان'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Type' : 'النوع'}
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="academic">{language === 'en' ? 'Academic' : 'أكاديمي'}</option>
                  <option value="sports">{language === 'en' ? 'Sports' : 'رياضي'}</option>
                  <option value="arts">{language === 'en' ? 'Arts' : 'فني'}</option>
                  <option value="other">{language === 'en' ? 'Other' : 'أخرى'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Start Date' : 'تاريخ البدء'}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'End Date' : 'تاريخ الانتهاء'}
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'Description' : 'الوصف'}
              </label>
              <textarea
                required
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
                {language === 'en' ? 'Save Competition' : 'حفظ المسابقة'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading competitions...' : 'جاري تحميل المسابقات...'}
          </div>
        ) : competitions.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No competitions found.' : 'لم يتم العثور على مسابقات.'}</p>
          </div>
        ) : (
          competitions.map((comp) => (
            <div key={comp.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {comp.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getStatusColor(comp.status)}`}>
                      {getStatusLabel(comp.status)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(comp.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {comp.description}
              </p>

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{comp.startDate} - {comp.endDate}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
