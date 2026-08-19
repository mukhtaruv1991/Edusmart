import { useStore } from '../../lib/store';
import { Building2, Users, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
  const { language } = useStore();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Schools' : 'إجمالي المدارس'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Users' : 'إجمالي المستخدمين'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'System Status' : 'حالة النظام'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">Online</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {language === 'en' ? 'Welcome to Admin Dashboard' : 'مرحباً بك في لوحة تحكم الإدارة'}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'Use the sidebar to navigate and manage the system.' : 'استخدم الشريط الجانبي للتنقل وإدارة النظام.'}
          </p>
        </div>
      </div>
    </div>
  );
}
