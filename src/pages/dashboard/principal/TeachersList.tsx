import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Users, Search, Edit2, Trash2, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Teacher {
  uid: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'inactive';
  createdAt: any;
}

export default function TeachersList() {
  const { user, language } = useStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'teacher'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTeachers: Teacher[] = [];
      snapshot.forEach((doc) => {
        fetchedTeachers.push({ uid: doc.id, ...doc.data() } as Teacher);
      });
      setTeachers(fetchedTeachers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching teachers:', error);
      toast.error(language === 'en' ? 'Failed to load teachers' : 'فشل في تحميل المعلمين');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleStatusChange = async (teacherId: string, newStatus: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', teacherId), { status: newStatus });
      toast.success(
        language === 'en' 
          ? `Teacher status updated to ${newStatus}` 
          : `تم تحديث حالة المعلم إلى ${newStatus === 'active' ? 'نشط' : 'غير نشط'}`
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(language === 'en' ? 'Failed to update status' : 'فشل في تحديث الحالة');
    }
  };

  const handleDelete = async (teacherId: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to remove this teacher?' : 'هل أنت متأكد أنك تريد إزالة هذا المعلم؟')) {
      return;
    }

    try {
      // In a real app, you might want to just soft delete or reassign them
      await deleteDoc(doc(db, 'users', teacherId));
      toast.success(language === 'en' ? 'Teacher removed successfully' : 'تم إزالة المعلم بنجاح');
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast.error(language === 'en' ? 'Failed to remove teacher' : 'فشل في إزالة المعلم');
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone?.includes(searchQuery) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Teachers Management' : 'إدارة المعلمين'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage teachers in your school' : 'إدارة المعلمين في مدرستك'}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="w-5 h-5" />
          <span>{language === 'en' ? 'Add Teacher' : 'إضافة معلم'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search teachers...' : 'البحث عن معلمين...'}
              className={`w-full ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Name' : 'الاسم'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Contact' : 'التواصل'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Status' : 'الحالة'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-center">{language === 'en' ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'Loading...' : 'جاري التحميل...'}
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'No teachers found.' : 'لم يتم العثور على معلمين.'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                          {teacher.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{teacher.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{teacher.phone}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.email}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        teacher.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        teacher.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {teacher.status === 'active' ? (language === 'en' ? 'Active' : 'نشط') :
                         teacher.status === 'pending' ? (language === 'en' ? 'Pending' : 'قيد الانتظار') :
                         (language === 'en' ? 'Inactive' : 'غير نشط')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {teacher.status !== 'active' && (
                          <button 
                            onClick={() => handleStatusChange(teacher.uid, 'active')}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title={language === 'en' ? 'Activate' : 'تنشيط'}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {teacher.status === 'active' && (
                          <button 
                            onClick={() => handleStatusChange(teacher.uid, 'inactive')}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                            title={language === 'en' ? 'Deactivate' : 'إلغاء تنشيط'}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={language === 'en' ? 'Edit' : 'تعديل'}
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher.uid)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={language === 'en' ? 'Remove' : 'إزالة'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
