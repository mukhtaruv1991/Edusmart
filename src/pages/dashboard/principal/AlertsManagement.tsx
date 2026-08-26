import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Plus, Trash2, AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useStore } from '../../../lib/store';
import { auth, db } from '../../../lib/firebase';

type AlertType = 'info' | 'warning' | 'success' | 'error';
type Audience = 'school' | 'teachers' | 'students' | 'parents';
type NotificationEntry = { id: string; title: string; body: string; audience: Audience; createdAt?: { toDate?: () => Date } };

export default function AlertsManagement() {
  const { user, language } = useStore();
  const [alerts, setAlerts] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AlertType>('info');
  const isTeacher = user?.role === 'teacher';
  const [audience, setAudience] = useState<Audience>(isTeacher ? 'students' : 'school');

  useEffect(() => {
    if (isTeacher) setAudience('students');
    if (!user?.schoolId) { setLoading(false); return; }
    const unsubscribe = onSnapshot(query(collection(db, 'notifications'), where('schoolId', '==', user.schoolId)), (snapshot) => {
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NotificationEntry));
      next.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setAlerts(next); setLoading(false);
    }, (error) => { console.error(error); toast.error(language === 'ar' ? 'فشل تحميل الإشعارات.' : 'Failed to load notifications.'); setLoading(false); });
    return () => unsubscribe();
  }, [user?.schoolId, language]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.schoolId || !auth.currentUser?.uid || !title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'notifications'), { title: title.trim(), body: body.trim(), type, audience, schoolId: user.schoolId, createdBy: auth.currentUser.uid, recipientIds: [], createdAt: serverTimestamp(), deepLink: '/notifications' });
      toast.success(language === 'ar' ? 'تم نشر الإشعار داخل المدرسة.' : 'Notification published to the school.'); setIsAdding(false); setTitle(''); setBody(''); setType('info'); setAudience(isTeacher ? 'students' : 'school');
    } catch (error) { console.error(error); toast.error(language === 'ar' ? 'تعذر نشر الإشعار. تأكد من جلسة Firebase والصلاحيات.' : 'Unable to publish notification. Check Firebase session and permissions.'); } finally { setSaving(false); }
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(db, 'notifications', id)); toast.success(language === 'ar' ? 'تم حذف الإشعار.' : 'Notification deleted.'); } catch (error) { console.error(error); toast.error(language === 'ar' ? 'تعذر حذف الإشعار.' : 'Unable to delete notification.'); } };
  const typeIcon = (value?: string) => value === 'warning' || value === 'error' ? <AlertTriangle className={`h-6 w-6 ${value === 'error' ? 'text-red-600' : 'text-amber-600'}`} /> : value === 'success' ? <CheckCircle className="h-6 w-6 text-emerald-600" /> : <Info className="h-6 w-6 text-blue-600" />;
  const audienceLabel = (value: Audience) => value === 'school' ? (language === 'ar' ? 'كل المدرسة' : 'Whole school') : value === 'teachers' ? (language === 'ar' ? 'المعلمون' : 'Teachers') : value === 'students' ? (language === 'ar' ? 'الطلاب' : 'Students') : (language === 'ar' ? 'أولياء الأمور' : 'Parents');

  return <div className="space-y-6"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Bell className="h-6 w-6 text-blue-600" />{language === 'ar' ? 'إدارة الإشعارات' : 'Notification management'}</h1><p className="mt-1 text-sm text-slate-500">{language === 'ar' ? 'نشر رسائل موجهة للمدرسة أو فئة محددة مع حفظها في Firestore.' : 'Publish targeted school messages stored in Firestore.'}</p></div><button type="button" onClick={() => setIsAdding((current) => !current)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus className="h-5 w-5" />{language === 'ar' ? 'إشعار جديد' : 'New notification'}</button></div>{isAdding && <form onSubmit={handleAdd} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">{language === 'ar' ? 'العنوان' : 'Title'}<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="input-field mt-1" /></label><label className="text-sm font-semibold">{language === 'ar' ? 'الجمهور' : 'Audience'}<select value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className="input-field mt-1">{!isTeacher && <option value="school">{language === 'ar' ? 'كل المدرسة' : 'Whole school'}</option>}{!isTeacher && <option value="teachers">{language === 'ar' ? 'المعلمون' : 'Teachers'}</option>}<option value="students">{language === 'ar' ? 'الطلاب' : 'Students'}</option>{!isTeacher && <option value="parents">{language === 'ar' ? 'أولياء الأمور' : 'Parents'}</option>}</select></label></div><div className="mt-4"><label className="text-sm font-semibold">{language === 'ar' ? 'نوع الإشعار' : 'Type'}<div className="mt-2 flex flex-wrap gap-4">{(['info', 'warning', 'success', 'error'] as AlertType[]).map((value) => <label key={value} className="flex items-center gap-2 text-sm font-normal"><input type="radio" checked={type === value} onChange={() => setType(value)} />{language === 'ar' ? ({ info: 'معلومة', warning: 'تحذير', success: 'نجاح', error: 'خطأ' }[value]) : value}</label>)}</div></label></div><label className="mt-4 block text-sm font-semibold">{language === 'ar' ? 'الرسالة' : 'Message'}<textarea required maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} rows={4} className="input-field mt-1" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setIsAdding(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{language === 'ar' ? 'نشر الإشعار' : 'Publish'}</button></div></form>}<div className="space-y-4">{loading ? <div className="py-10 text-center text-slate-500">{language === 'ar' ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}</div> : !alerts.length ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500"><Bell className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-3">{language === 'ar' ? 'لا توجد إشعارات بعد.' : 'No notifications yet.'}</p></div> : alerts.map((alert) => <article key={alert.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="mt-1 shrink-0">{typeIcon((alert as NotificationEntry & { type?: string }).type)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">{alert.title}</h3><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-700">{audienceLabel(alert.audience)}</span><span>{alert.createdAt?.toDate?.()?.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US') || '—'}</span></div></div>{!isTeacher && <button type="button" onClick={() => void remove(alert.id)} className="rounded-lg p-2 text-slate-400 hover:text-red-500"><Trash2 className="h-5 w-5" /></button>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{alert.body}</p></div></article>)}</div></div>;
}
