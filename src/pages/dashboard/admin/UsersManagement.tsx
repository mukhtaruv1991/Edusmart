import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Users, Search, Edit2, Trash2, CheckCircle, XCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AppUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  school: string;
  status: 'pending' | 'active' | 'inactive';
  createdAt: any;
}

export default function UsersManagement() {
  const { language } = useStore();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: AppUser[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as AppUser);
      });
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      toast.error(language === 'en' ? 'Failed to load users' : 'فشل في تحميل المستخدمين');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      toast.success(
        language === 'en' 
          ? `User status updated to ${newStatus}` 
          : `تم تحديث حالة المستخدم إلى ${newStatus === 'active' ? 'نشط' : 'غير نشط'}`
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(language === 'en' ? 'Failed to update status' : 'فشل في تحديث الحالة');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to remove this user?' : 'هل أنت متأكد أنك تريد إزالة هذا المستخدم؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success(language === 'en' ? 'User removed successfully' : 'تم إزالة المستخدم بنجاح');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(language === 'en' ? 'Failed to remove user' : 'فشل في إزالة المستخدم');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone?.includes(searchQuery) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = [
    { id: 'all', labelEn: 'All Roles', labelAr: 'جميع الأدوار' },
    { id: 'admin', labelEn: 'Admin', labelAr: 'مدير نظام' },
    { id: 'principal', labelEn: 'Principal', labelAr: 'مدير مدرسة' },
    { id: 'teacher', labelEn: 'Teacher', labelAr: 'معلم' },
    { id: 'student', labelEn: 'Student', labelAr: 'طالب' },
    { id: 'parent', labelEn: 'Parent', labelAr: 'ولي أمر' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Users Management' : 'إدارة المستخدمين'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage all users across the system' : 'إدارة جميع المستخدمين في النظام'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search users...' : 'البحث عن مستخدمين...'}
              className={`w-full ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white`}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          >
            {roles.map(role => (
              <option key={role.id} value={role.id}>
                {language === 'en' ? role.labelEn : role.labelAr}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Name' : 'الاسم'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Role' : 'الدور'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'School' : 'المدرسة'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Status' : 'الحالة'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-center">{language === 'en' ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'Loading...' : 'جاري التحميل...'}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'No users found.' : 'لم يتم العثور على مستخدمين.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {roles.find(r => r.id === u.role)?.[language === 'en' ? 'labelEn' : 'labelAr'] || u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {u.school || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        u.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {u.status === 'active' ? (language === 'en' ? 'Active' : 'نشط') :
                         u.status === 'pending' ? (language === 'en' ? 'Pending' : 'قيد الانتظار') :
                         (language === 'en' ? 'Inactive' : 'غير نشط')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {u.status !== 'active' && (
                          <button 
                            onClick={() => handleStatusChange(u.uid, 'active')}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title={language === 'en' ? 'Activate' : 'تنشيط'}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {u.status === 'active' && (
                          <button 
                            onClick={() => handleStatusChange(u.uid, 'inactive')}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                            title={language === 'en' ? 'Deactivate' : 'إلغاء تنشيط'}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(u.uid)}
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
