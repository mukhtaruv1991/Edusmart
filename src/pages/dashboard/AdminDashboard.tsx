import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';

type SchoolStatus = 'pending' | 'approved' | 'active' | 'rejected';

interface SchoolRecord {
  id: string;
  name?: string;
  country?: string;
  city?: string;
  district?: string;
  status?: SchoolStatus;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  createdAt?: string | { toDate?: () => Date };
}

interface UserRecord {
  status?: string;
}

interface AdminStats {
  schools: number;
  pendingSchools: number;
  users: number;
  activeUsers: number;
}

const isPendingSchool = (school: SchoolRecord) => school.status === 'pending' || school.approvalStatus === 'pending';

const formatCreatedAt = (value: SchoolRecord['createdAt'], language: 'ar' | 'en') => {
  if (!value) return language === 'ar' ? 'تاريخ غير محدد' : 'Date unavailable';
  const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
  if (!date || Number.isNaN(date.getTime())) return language === 'ar' ? 'تاريخ غير محدد' : 'Date unavailable';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-YE' : 'en-US', { dateStyle: 'medium' }).format(date);
};

export default function AdminDashboard() {
  const { language } = useStore();
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({ schools: 0, pendingSchools: 0, users: 0, activeUsers: 0 });
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeSchools = onSnapshot(
      collection(db, 'schools'),
      (snapshot) => {
        const nextSchools = snapshot.docs.map((schoolDoc) => ({ id: schoolDoc.id, ...schoolDoc.data() } as SchoolRecord));
        setSchools(nextSchools);
        setStats((current) => ({ ...current, schools: nextSchools.length, pendingSchools: nextSchools.filter(isPendingSchool).length }));
        setSchoolsLoaded(true);
      },
      (snapshotError) => {
        console.error('Error loading admin schools:', snapshotError);
        setError(language === 'ar' ? 'تعذر تحميل إحصاءات المدارس. تحقق من نشر قواعد Firestore.' : 'Unable to load school statistics. Check the Firestore rules deployment.');
        setSchoolsLoaded(true);
      },
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map((userDoc) => userDoc.data() as UserRecord);
        setStats((current) => ({
          ...current,
          users: users.length,
          activeUsers: users.filter((user) => user.status !== 'inactive').length,
        }));
        setUsersLoaded(true);
      },
      (snapshotError) => {
        console.error('Error loading admin users:', snapshotError);
        setError(language === 'ar' ? 'تعذر تحميل إحصاءات المستخدمين. تحقق من صلاحيات حساب الإدارة.' : 'Unable to load user statistics. Check the admin account permissions.');
        setUsersLoaded(true);
      },
    );

    return () => {
      unsubscribeSchools();
      unsubscribeUsers();
    };
  }, [language]);

  const pendingSchools = useMemo(
    () => schools.filter(isPendingSchool).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    [schools],
  );
  const loading = !schoolsLoaded || !usersLoaded;

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">{language === 'ar' ? 'مركز التحكم' : 'Control center'}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'لوحة إدارة EduSmart' : 'EduSmart administration'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'متابعة المدارس والمستخدمين وطلبات الاعتماد من مكان واحد.' : 'Monitor schools, users, and approval requests from one place.'}</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          <Activity className="h-4 w-4" />
          {language === 'ar' ? 'متصل بقاعدة Firestore الافتراضية' : 'Connected to the default Firestore database'}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200" role="alert">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} label={language === 'ar' ? 'إجمالي المدارس' : 'Total schools'} value={stats.schools} tone="blue" />
        <StatCard icon={<Clock3 className="h-5 w-5" />} label={language === 'ar' ? 'طلبات قيد الاعتماد' : 'Pending approvals'} value={stats.pendingSchools} tone="amber" />
        <StatCard icon={<Users className="h-5 w-5" />} label={language === 'ar' ? 'إجمالي المستخدمين' : 'Total users'} value={stats.users} tone="violet" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label={language === 'ar' ? 'المستخدمون النشطون' : 'Active users'} value={stats.activeUsers} tone="emerald" />
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'طلبات المدارس الجديدة' : 'New school requests'}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'راجع الطلبات ثم اعتمد المدرسة أو ارفضها.' : 'Review requests and approve or reject them.'}</p>
            </div>
            <Link to="/admin/schools" className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300">
              {language === 'ar' ? 'إدارة المدارس' : 'Manage schools'}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {pendingSchools.length === 0 ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-700/40 dark:text-gray-300">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              {language === 'ar' ? 'لا توجد طلبات مدارس معلقة حالياً.' : 'There are no pending school requests.'}
            </div>
          ) : (
            <div className="mt-5 divide-y divide-gray-100 dark:divide-gray-700">
              {pendingSchools.slice(0, 5).map((school) => (
                <div key={school.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-white">{school.name || (language === 'ar' ? 'مدرسة بلا اسم' : 'Unnamed school')}</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{[school.country, school.city, school.district].filter(Boolean).join(' • ') || (language === 'ar' ? 'الموقع غير محدد' : 'Location unavailable')}</p>
                    <p className="mt-1 text-xs text-gray-400">{formatCreatedAt(school.createdAt, language)}</p>
                  </div>
                  <Link to="/admin/schools" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20">
                    {language === 'ar' ? 'فتح الطلب' : 'Open request'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'إجراءات سريعة' : 'Quick actions'}</h2>
          <div className="mt-4 space-y-3">
            <QuickAction to="/admin/schools" icon={<Building2 className="h-5 w-5" />} title={language === 'ar' ? 'إدارة المدارس' : 'Manage schools'} description={language === 'ar' ? 'إضافة مدرسة ومراجعة الطلبات.' : 'Add schools and review requests.'} />
            <QuickAction to="/admin/users" icon={<Users className="h-5 w-5" />} title={language === 'ar' ? 'إدارة المستخدمين' : 'Manage users'} description={language === 'ar' ? 'البحث وتفعيل الحسابات.' : 'Search and activate accounts.'} />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'blue' | 'amber' | 'violet' | 'emerald' }) {
  const tones = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  } as const;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, title, description }: { to: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-800 dark:hover:bg-blue-900/10">
      <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{icon}</div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <ArrowLeft className="ms-auto h-4 w-4 shrink-0 text-gray-400" />
    </Link>
  );
}
