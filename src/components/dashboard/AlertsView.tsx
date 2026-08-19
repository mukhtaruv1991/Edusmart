import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'teachers' | 'students' | 'parents';
  createdAt: any;
}

export default function AlertsView() {
  const { user, language } = useStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.school || !user?.role) return;

    // Filter alerts for 'all' or specific role
    const q = query(
      collection(db, 'alerts'),
      where('school', '==', user.school),
      where('targetAudience', 'in', ['all', user.role + 's']) // e.g., 'teachers', 'students'
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Alerts & Notifications' : 'التنبيهات والإشعارات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'View important school announcements' : 'عرض إعلانات المدرسة الهامة'}
          </p>
        </div>
      </div>

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
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.createdAt?.toDate().toLocaleString(language === 'en' ? 'en-US' : 'ar-SA')}
                      </span>
                    </div>
                  </div>
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
