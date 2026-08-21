import { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  BookOpen, Users, FileText, Settings, LogOut, Globe, LayoutDashboard, 
  Menu, X, MessageSquare, Trophy, User, Calendar, Bell, MapPin, 
  DollarSign, CreditCard, GraduationCap, UsersRound, BookMarked, Building2, ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DashboardLayout() {
  const { user, isAuthReady, language, setLanguage } = useStore();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isAuthReady) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsOnboarding) return <Navigate to="/onboarding" replace />;

  const handleLogout = async () => {
    await signOut(auth);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const getNavItems = () => {
    const items = [
      { name: language === 'en' ? 'Dashboard' : 'لوحة القيادة', path: `/${user.role}`, icon: LayoutDashboard },
    ];

    switch (user.role) {
      case 'student':
        items.push(
          { name: language === 'en' ? 'My Curriculums' : 'مناهجي', path: '/student/curriculums', icon: BookOpen },
          { name: language === 'en' ? 'My Private Exams' : 'اختباراتي الخاصة', path: '/student/private-exams', icon: FileText },
          { name: language === 'en' ? 'School Exams' : 'الاختبارات المدرسية', path: '/student/school-exams', icon: FileText },
          { name: language === 'en' ? 'Competitions' : 'المسابقات', path: '/student/competitions', icon: Trophy },
          { name: language === 'en' ? 'My Profile' : 'صفحتي الشخصية', path: '/student/profile', icon: User },
          { name: language === 'en' ? 'Chats' : 'المحادثات', path: '/student/chats', icon: MessageSquare }
        );
        break;
      case 'principal':
        items.push(
          { name: language === 'en' ? 'Add Teachers' : 'إضافة معلمين', path: '/principal/add-teachers', icon: Users },
          { name: language === 'en' ? 'Add Curriculums' : 'إضافة مناهج', path: '/principal/add-curriculums', icon: BookOpen },
          { name: language === 'en' ? 'Competitions' : 'المسابقات', path: '/principal/competitions', icon: Trophy },
          { name: language === 'en' ? 'Classes/Departments' : 'الصفوف والأقسام', path: '/principal/classes', icon: GraduationCap },
          { name: language === 'en' ? 'Teachers' : 'المعلمين', path: '/principal/teachers', icon: Users },
          { name: language === 'en' ? 'Calendar' : 'التقويم', path: '/principal/calendar', icon: Calendar },
          { name: language === 'en' ? 'Chats' : 'المحادثات', path: '/principal/chats', icon: MessageSquare },
          { name: language === 'en' ? 'Alerts' : 'التنبيهات', path: '/principal/alerts', icon: Bell },
          { name: language === 'en' ? 'Parents' : 'أولياء الأمور', path: '/principal/parents', icon: UsersRound },
          { name: language === 'en' ? 'Notifications' : 'الإشعارات', path: '/principal/notifications', icon: Bell },
          { name: language === 'en' ? 'Tracking' : 'تتبع', path: '/principal/tracking', icon: MapPin },
          { name: language === 'en' ? 'Settings' : 'الضبط', path: '/principal/settings', icon: Settings },
          { name: language === 'en' ? 'Financials' : 'الرواتب والإيرادات', path: '/principal/financials', icon: DollarSign },
          { name: language === 'en' ? 'Expenses' : 'المصروفات', path: '/principal/expenses', icon: CreditCard }
        );
        break;
      case 'teacher':
        items.push(
          { name: language === 'en' ? 'Classes' : 'الصفوف', path: '/teacher/classes', icon: GraduationCap },
          { name: language === 'en' ? 'Students' : 'الطلاب', path: '/teacher/students', icon: Users },
          { name: language === 'en' ? 'Competitions' : 'المسابقات', path: '/teacher/competitions', icon: Trophy },
          { name: language === 'en' ? 'Exams' : 'الاختبارات', path: '/teacher/exams', icon: FileText },
          { name: language === 'en' ? 'Alerts' : 'التنبيهات', path: '/teacher/alerts', icon: Bell },
          { name: language === 'en' ? 'Notifications' : 'الإشعارات', path: '/teacher/notifications', icon: Bell },
          { name: language === 'en' ? 'Calendar' : 'التقويم', path: '/teacher/calendar', icon: Calendar },
          { name: language === 'en' ? 'Chats' : 'المحادثات', path: '/teacher/chats', icon: MessageSquare }
        );
        break;
      case 'parent':
        items.push(
          { name: language === 'en' ? 'Children' : 'الأبناء والبنات', path: '/parent/children', icon: Users },
          { name: language === 'en' ? 'Chats' : 'المحادثات', path: '/parent/chats', icon: MessageSquare },
          { name: language === 'en' ? 'Notifications' : 'الإشعارات', path: '/parent/notifications', icon: Bell },
          { name: language === 'en' ? 'Tracking' : 'تتبع', path: '/parent/tracking', icon: MapPin }
        );
        break;
      case 'admin':
        items.push(
          { name: language === 'en' ? 'Control Center' : 'مركز التحكم', path: '/admin/control-center', icon: ShieldCheck },
          { name: language === 'en' ? 'Schools' : 'المدارس', path: '/admin/schools', icon: Building2 },
          { name: language === 'en' ? 'Users' : 'المستخدمين', path: '/admin/users', icon: Users },
          { name: language === 'en' ? 'Settings' : 'الضبط', path: '/admin/settings', icon: Settings }
        );
        break;
    }
    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 start-0 z-30 w-64 bg-white dark:bg-gray-800 border-e dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out",
          !isSidebarOpen ? "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden" : "translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b dark:border-gray-700 min-w-64">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              E
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">EduSmart AI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-w-64">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" 
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t dark:border-gray-700 space-y-2 min-w-64">
          <button
            onClick={toggleLanguage}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <Globe className="w-5 h-5" />
            {language === 'en' ? 'العربية' : 'English'}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {language === 'en' ? 'Logout' : 'تسجيل الخروج'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ms-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white capitalize hidden sm:block">
              {user.role} {language === 'en' ? 'Portal' : 'بوابة'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
