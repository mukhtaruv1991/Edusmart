import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle, Info, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { useStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { enableDeviceNotifications, PushConfigurationError } from '../../lib/pushNotifications';

type NotificationEntry = { id: string; title: string; body: string; type?: 'info' | 'warning' | 'success' | 'error'; audience?: string; createdAt?: { toDate?: () => Date } };

export default function AlertsView() {
  const { user, language } = useStore();
  const [alerts, setAlerts] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enablingPush, setEnablingPush] = useState(false);
  useEffect(() => {
    if (!user?.schoolId || !user.role) { setLoading(false); return; }
    const allowed = new Set(['school', 'all', `${user.role}s`]);
    const unsubscribe = onSnapshot(query(collection(db, 'notifications'), where('schoolId', '==', user.schoolId)), (snapshot) => {
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NotificationEntry)).filter((item) => !item.audience || allowed.has(item.audience));
      next.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0)); setAlerts(next); setLoading(false);
    }, (error) => { console.error(error); toast.error(language === 'ar' ? 'فشل تحميل الإشعارات.' : 'Failed to load notifications.'); setLoading(false); });
    return () => unsubscribe();
  }, [user?.schoolId, user?.role, language]);
  const icon = (type?: string) => type === 'warning' || type === 'error' ? <AlertTriangle className={`h-6 w-6 ${type === 'error' ? 'text-red-600' : 'text-amber-600'}`} /> : type === 'success' ? <CheckCircle className="h-6 w-6 text-emerald-600" /> : <Info className="h-6 w-6 text-blue-600" />;
  const handleEnablePush = async () => {
    if (enablingPush) return;
    setEnablingPush(true);
    try {
      await enableDeviceNotifications();
      toast.success(language === 'ar' ? 'تم تفعيل إشعارات الجهاز.' : 'Device notifications enabled.');
    } catch (error) {
      const message = error instanceof PushConfigurationError && error.message === 'PUSH_CONFIGURATION_MISSING'
        ? (language === 'ar' ? 'يلزم إعداد مفتاح VAPID في Firebase قبل تفعيل إشعارات الجهاز.' : 'A Firebase VAPID key is required before enabling device notifications.')
        : error instanceof Error && error.message === 'NOTIFICATION_DENIED'
          ? (language === 'ar' ? 'تم رفض صلاحية الإشعارات من المتصفح.' : 'Notification permission was denied by the browser.')
          : (language === 'ar' ? 'تعذر تفعيل إشعارات الجهاز، وما زالت إشعارات التطبيق متاحة.' : 'Could not enable device notifications; in-app notifications remain available.');
      toast.error(message);
    } finally {
      setEnablingPush(false);
    }
  };
  return <div className="space-y-6"><header className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/40 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Bell className="h-6 w-6 text-blue-600" />{language === 'en' ? 'Alerts & notifications' : 'التنبيهات والإشعارات'}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{language === 'en' ? 'Important messages from your school.' : 'الرسائل المهمة من مدرستك.'}</p></div><button type="button" onClick={() => void handleEnablePush()} disabled={enablingPush} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{enablingPush ? (language === 'ar' ? 'جاري التفعيل...' : 'Enabling...') : (language === 'ar' ? 'تفعيل إشعارات الجهاز' : 'Enable device notifications')}</button></header>{loading ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="me-2 h-5 w-5 animate-spin" />{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div> : !alerts.length ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500"><Bell className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-3">{language === 'ar' ? 'لا توجد إشعارات موجهة إليك.' : 'No notifications for you.'}</p></div> : <div className="space-y-4">{alerts.map((alert) => <article key={alert.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mt-1 shrink-0">{icon(alert.type)}</div><div><h2 className="font-bold text-slate-900 dark:text-white">{alert.title}</h2><p className="mt-1 text-xs text-slate-400">{alert.createdAt?.toDate?.()?.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US') || '—'}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{alert.body}</p></div></article>)}</div>}</div>;
}
