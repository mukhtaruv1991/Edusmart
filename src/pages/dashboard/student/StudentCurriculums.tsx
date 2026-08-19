import React, { useState } from 'react';
import { useStore } from '../../../lib/store';
import { BookOpen, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StudentCurriculums() {
  const { language } = useStore();
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Mock data for now
  const curriculums = [
    { id: 1, title: 'Mathematics 101', titleAr: 'الرياضيات 101', teacher: 'Mr. Ahmed', status: 'active' },
    { id: 2, title: 'Physics Basics', titleAr: 'أساسيات الفيزياء', teacher: 'Mr. Khalid', status: 'active' },
  ];

  const requests = [
    { id: 1, title: 'Advanced Chemistry', titleAr: 'كيمياء متقدمة', status: 'pending', date: '2026-03-28' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === 'en' ? 'My Curriculums' : 'مناهجي'}
        </h1>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {language === 'en' ? 'Request Curriculum' : 'طلب إضافة منهج'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {curriculums.map((curr) => (
          <div key={curr.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {language === 'en' ? curr.title : curr.titleAr}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'en' ? 'Teacher: ' : 'المعلم: '} {curr.teacher}
            </p>
            <div className="mt-4 flex justify-end">
              <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                {language === 'en' ? 'View Details' : 'عرض التفاصيل'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {requests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'en' ? 'Pending Requests' : 'الطلبات المعلقة'}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {requests.map((req) => (
                <li key={req.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {language === 'en' ? req.title : req.titleAr}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{req.date}</p>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {language === 'en' ? 'Pending Approval' : 'قيد الانتظار'}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'en' ? 'Request New Curriculum' : 'طلب منهج جديد'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Curriculum Code or Name' : 'رمز أو اسم المنهج'}
                </label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={language === 'en' ? 'Enter code...' : 'أدخل الرمز...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Teacher (Optional)' : 'المعلم (اختياري)'}
                </label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={language === 'en' ? 'Search teacher...' : 'ابحث عن معلم...'}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'en' ? 'Send Request' : 'إرسال الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
