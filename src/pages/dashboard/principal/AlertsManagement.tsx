import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Bell, Plus, Trash2, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'teachers' | 'students' | 'parents';
  createdAt: any;
}

export default function AlertsManagement() {
  const { user, language } = useStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [targetAudience, setTargetAudience] = useState<'all' | 'teachers' | 'students' | 'parents'>('all');

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'alerts'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Alert[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Alert);
      });
      // Sort by createdAt descending
      fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAlerts(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching alerts:', error);
      toast.error(language === 'en' ? 'Failed to load alerts' : 'فشل في تحميل التنبيهات');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school) return;

    try {
      await addDoc(collection(db, 'alerts'), {
        title,
        message,
        type,
        targetAudience,
        school: user.school,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'en' ? 'Alert sent successfully' : 'تم إرسال التنبيه بنجاح');
      setIsAdding(false);
      setTitle('');
      setMessage('');
      setType('info');
      setTargetAudience('all');
    } catch (error) {
      console.error('Error adding alert:', error);
      toast.error(language === 'en' ? 'Failed to send alert' : 'فشل في إرسال التنبيه');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this alert?' : 'هل أنت متأكد أنك تريد حذف هذا التنبيه؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'alerts', id));
      toast.success(language === 'en' ? 'Alert deleted successfully' : 'تم حذف التنبيه بنجاح');
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error(language === 'en' ? 'Failed to delete alert' : 'فشل في حذف التنبيه');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-green-600" />;
      default: return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-900/30';
      case 'error': return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30';
      case 'success': return 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30';
      default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30';
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'teachers': return language === 'en' ? 'Teachers' : 'المعلمين';
      case 'students': return language === 'en' ? 'Students' : 'الطلاب';
      case 'parents': return language === 'en' ? 'Parents' : 'أولياء الأمور';
      default: return language === 'en' ? 'Everyone' : 'الجميع';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Alerts Management' : 'إدارة التنبيهات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Send and manage school-wide alerts' : 'إرسال وإدارة التنبيهات المدرسية'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Send Alert' : 'إرسال تنبيه'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {language === 'en' ? 'Create New Alert' : 'إنشاء تنبيه جديد'}
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
                  {language === 'en' ? 'Target Audience' : 'الجمهور المستهدف'}
                </label>
                <select
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="all">{language === 'en' ? 'Everyone' : 'الجميع'}</option>
                  <option value="teachers">{language === 'en' ? 'Teachers' : 'المعلمين'}</option>
                  <option value="students">{language === 'en' ? 'Students' : 'الطلاب'}</option>
                  <option value="parents">{language === 'en' ? 'Parents' : 'أولياء الأمور'}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Alert Type' : 'نوع التنبيه'}
                </label>
                <div className="flex gap-4">
                  {(['info', 'warning', 'success', 'error'] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        checked={type === t}
                        onChange={(e) => setType(e.target.value as any)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize text-gray-700 dark:text-gray-300">
                        {language === 'en' ? t : 
                         t === 'info' ? 'معلومة' : 
                         t === 'warning' ? 'تحذير' : 
                         t === 'success' ? 'نجاح' : 'خطأ'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'Message' : 'الرسالة'}
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
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
                {language === 'en' ? 'Send Alert' : 'إرسال التنبيه'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading alerts...' : 'جاري تحميل التنبيهات...'}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No alerts found.' : 'لم يتم العثور على تنبيهات.'}</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`p-5 rounded-xl border ${getTypeColor(alert.type)} flex flex-col sm:flex-row gap-4`}>
              <div className="flex-shrink-0 mt-1">
                {getTypeIcon(alert.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {alert.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-gray-700 dark:text-gray-300">
                        {language === 'en' ? 'To:' : 'إلى:'} {getAudienceLabel(alert.targetAudience)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.createdAt?.toDate().toLocaleString(language === 'en' ? 'en-US' : 'ar-SA')}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-wrap">
                  {alert.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
