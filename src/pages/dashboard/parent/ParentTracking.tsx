import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { MapPin, Bus, Clock, AlertTriangle } from 'lucide-react';

export default function ParentTracking() {
  const { language } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Live Tracking' : 'التتبع المباشر'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Track school buses and student attendance' : 'تتبع حافلات المدرسة وحضور الطلاب'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">{language === 'en' ? 'Loading tracking data...' : 'جاري تحميل بيانات التتبع...'}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 opacity-50"></div>
            <div className="z-10 text-center p-6">
              <MapPin className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {language === 'en' ? 'Interactive Map' : 'الخريطة التفاعلية'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {language === 'en' 
                  ? 'Map integration would be displayed here, showing real-time locations of school buses and student check-ins.' 
                  : 'سيتم عرض تكامل الخريطة هنا، موضحاً المواقع في الوقت الفعلي لحافلات المدرسة وتسجيل حضور الطلاب.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Bus className="w-5 h-5 text-blue-600" />
                {language === 'en' ? 'Bus Status' : 'حالة الحافلة'}
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Bus #102</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Driver: Ahmed Ali</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {language === 'en' ? 'On Route' : 'في الطريق'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mt-3">
                    <Clock className="w-4 h-4" />
                    <span>{language === 'en' ? 'ETA: 15 mins' : 'الوقت المتوقع: 15 دقيقة'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                {language === 'en' ? 'Recent Updates' : 'آخر التحديثات'}
              </h3>
              
              <div className="space-y-4">
                <div className="relative pl-6 pb-4 border-l-2 border-blue-200 dark:border-blue-900 last:border-0 last:pb-0">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800"></div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {language === 'en' ? 'Bus departed from school' : 'غادرت الحافلة من المدرسة'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2:15 PM</p>
                </div>
                <div className="relative pl-6 pb-4 border-l-2 border-blue-200 dark:border-blue-900 last:border-0 last:pb-0">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800"></div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {language === 'en' ? 'Student boarded bus' : 'صعد الطالب إلى الحافلة'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2:20 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
