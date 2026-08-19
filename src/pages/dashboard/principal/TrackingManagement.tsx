import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { MapPin, Bus, User, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

interface TrackingData {
  id: string;
  type: 'bus' | 'student';
  name: string;
  status: 'active' | 'inactive' | 'delayed';
  lastLocation: string;
  lastUpdated: any;
  driverName?: string;
  route?: string;
}

export default function TrackingManagement() {
  const { user, language } = useStore();
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bus' | 'student'>('all');

  useEffect(() => {
    if (!user?.school) return;

    // In a real app, this would query a 'tracking' collection
    // For now, we'll simulate some data based on the school
    const q = query(
      collection(db, 'tracking'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: TrackingData[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as TrackingData);
      });
      
      // Add some dummy data if empty for demonstration
      if (fetched.length === 0) {
        fetched.push(
          { id: '1', type: 'bus', name: 'Bus A', status: 'active', lastLocation: 'Main St & 1st Ave', lastUpdated: new Date(), driverName: 'Ahmed Ali', route: 'North Route' },
          { id: '2', type: 'bus', name: 'Bus B', status: 'delayed', lastLocation: 'School Gate', lastUpdated: new Date(), driverName: 'Mohammed Saleh', route: 'South Route' },
          { id: '3', type: 'student', name: 'Omar Khalid', status: 'active', lastLocation: 'Classroom 3B', lastUpdated: new Date() }
        );
      }

      setTrackingData(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tracking data:', error);
      toast.error(language === 'en' ? 'Failed to load tracking data' : 'فشل في تحميل بيانات التتبع');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const filteredData = trackingData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.route?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'delayed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return language === 'en' ? 'Active' : 'نشط';
      case 'delayed': return language === 'en' ? 'Delayed' : 'متأخر';
      default: return language === 'en' ? 'Inactive' : 'غير نشط';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Live Tracking' : 'التتبع المباشر'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Track school buses and student attendance' : 'تتبع الحافلات المدرسية وحضور الطلاب'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search by name, driver, or route...' : 'البحث بالاسم، السائق، أو المسار...'}
              className={`w-full ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white`}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          >
            <option value="all">{language === 'en' ? 'All Types' : 'جميع الأنواع'}</option>
            <option value="bus">{language === 'en' ? 'Buses' : 'الحافلات'}</option>
            <option value="student">{language === 'en' ? 'Students' : 'الطلاب'}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {language === 'en' ? 'Loading tracking data...' : 'جاري تحميل بيانات التتبع...'}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{language === 'en' ? 'No tracking data found.' : 'لم يتم العثور على بيانات تتبع.'}</p>
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-100 dark:border-gray-600 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'bus' 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {item.type === 'bus' ? <Bus className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {item.type === 'bus' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{language === 'en' ? 'Driver:' : 'السائق:'}</span>
                        <span className="font-medium">{item.driverName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{language === 'en' ? 'Route:' : 'المسار:'}</span>
                        <span className="font-medium">{item.route}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {language === 'en' ? 'Last Location:' : 'آخر موقع:'}
                    </span>
                    <span className="font-medium text-right">{item.lastLocation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {language === 'en' ? 'Updated:' : 'تم التحديث:'}
                    </span>
                    <span className="font-medium">
                      {item.lastUpdated instanceof Date 
                        ? item.lastUpdated.toLocaleTimeString(language === 'en' ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' })
                        : item.lastUpdated?.toDate?.().toLocaleTimeString(language === 'en' ? 'en-US' : 'ar-SA', { hour: '2-digit', minute: '2-digit' }) || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
