import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AlertTriangle, Bus, CalendarCheck, Clock, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';

interface TrackingRecord {
  id: string;
  studentName?: string;
  type?: 'attendance' | 'bus' | 'alert';
  status?: string;
  message?: string;
  busNumber?: string;
  driverName?: string;
  etaMinutes?: number;
  location?: string;
  createdAt?: unknown;
}

const formatTime = (value: unknown, language: 'ar' | 'en') => {
  if (!value) return '-';
  const date = typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US');
};

export default function ParentTracking() {
  const { language, user } = useStore();
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTracking = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'tracking'), where('parentId', '==', user.uid)));
      setRecords(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TrackingRecord)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
    } catch (error) {
      console.error('Error loading parent tracking:', error);
      toast.error(language === 'ar' ? 'تعذر تحميل بيانات التتبع' : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTracking(); }, [user?.uid]);

  const buses = records.filter((item) => item.type === 'bus' || item.busNumber);
  const attendance = records.filter((item) => item.type === 'attendance');
  const alerts = records.filter((item) => item.type === 'alert' || item.status === 'alert');

  return <div className="space-y-6"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><MapPin className="h-6 w-6 text-blue-600" />{language === 'en' ? 'Attendance and transport' : 'الحضور والنقل المدرسي'}</h1><p className="mt-1 text-gray-500 dark:text-gray-400">{language === 'en' ? 'Follow verified school updates for your children' : 'تابع تحديثات المدرسة الموثقة الخاصة بأبنائك'}</p></div><button type="button" onClick={() => void loadTracking()} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><RefreshCw className="h-4 w-4" />{language === 'ar' ? 'تحديث' : 'Refresh'}</button></div>
    {loading ? <div className="flex h-64 items-center justify-center text-gray-500">{language === 'ar' ? 'جاري تحميل التحديثات...' : 'Loading updates...'}</div> : <><div className="grid gap-4 sm:grid-cols-3"><Summary icon={<CalendarCheck className="h-5 w-5" />} label={language === 'ar' ? 'سجلات الحضور' : 'Attendance records'} value={`${attendance.length}`} color="green" /><Summary icon={<Bus className="h-5 w-5" />} label={language === 'ar' ? 'تحديثات النقل' : 'Transport updates'} value={`${buses.length}`} color="blue" /><Summary icon={<AlertTriangle className="h-5 w-5" />} label={language === 'ar' ? 'التنبيهات' : 'Alerts'} value={`${alerts.length}`} color="amber" /></div><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><section className="min-h-[360px] rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><MapPin className="h-5 w-5 text-blue-600" />{language === 'ar' ? 'آخر السجلات' : 'Recent records'}</h2></div>{records.length ? <div className="mt-5 space-y-3">{records.slice(0, 20).map((record) => <div key={record.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/40"><span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${record.type === 'alert' ? 'bg-amber-100 text-amber-600' : record.type === 'bus' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{record.type === 'alert' ? <AlertTriangle className="h-5 w-5" /> : record.type === 'bus' ? <Bus className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-gray-900 dark:text-white">{record.studentName || (language === 'ar' ? 'تحديث طالب' : 'Student update')}</p><span className="text-xs text-gray-400">{formatTime(record.createdAt, language)}</span></div><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{record.message || record.status || (language === 'ar' ? 'تم تسجيل تحديث جديد.' : 'A new update was recorded.')}</p>{record.location ? <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><MapPin className="h-3 w-3" />{record.location}</p> : null}</div></div>)}</div> : <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500"><MapPin className="mb-3 h-12 w-12 opacity-20" /><p>{language === 'ar' ? 'لا توجد بيانات تتبع مرتبطة بهذا الحساب.' : 'No tracking data is linked to this account yet.'}</p><p className="mt-2 max-w-md text-xs">{language === 'ar' ? 'تظهر البيانات هنا عندما تنشر المدرسة سجلاً يحتوي على parentId لولي الأمر.' : 'Records appear when the school publishes a tracking item with this parentId.'}</p></div>}</section><aside className="space-y-6">{buses.length ? <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><Bus className="h-5 w-5 text-blue-600" />{language === 'ar' ? 'حالة الحافلات' : 'Bus status'}</h2><div className="mt-4 space-y-3">{buses.slice(0, 5).map((bus) => <div key={bus.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-700"><div className="flex justify-between"><span className="font-semibold text-gray-900 dark:text-white">{bus.busNumber || '-'}</span><span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">{bus.status || (language === 'ar' ? 'محدث' : 'Updated')}</span></div><p className="mt-2 text-sm text-gray-500">{bus.driverName || ''}</p>{bus.etaMinutes ? <p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" />{language === 'ar' ? `الوصول خلال ${bus.etaMinutes} دقيقة` : `ETA ${bus.etaMinutes} minutes`}</p> : null}</div>)}</div></section> : null}<section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><AlertTriangle className="h-5 w-5 text-amber-600" />{language === 'ar' ? 'التنبيهات المهمة' : 'Important alerts'}</h2>{alerts.length ? <div className="mt-4 space-y-3">{alerts.slice(0, 5).map((alert) => <div key={alert.id} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">{alert.message || alert.status}</div>)}</div> : <p className="mt-4 text-sm text-gray-500">{language === 'ar' ? 'لا توجد تنبيهات.' : 'No alerts.'}</p>}</section></aside></div></>}</div>;
}

function Summary({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: 'green' | 'blue' | 'amber' }) { const colors = { green: 'bg-green-100 text-green-600', blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600' }; return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div>; }
