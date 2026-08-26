import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'meeting' | 'exam' | 'holiday' | 'other';
}

export default function CalendarView() {
  const { user, language } = useStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = user?.schoolId || user?.school;
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'academicCalendar'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Event[] = [];
      snapshot.forEach((calendarDoc) => {
        const data = calendarDoc.data();
        if (data.scope === 'national' || (data.scope === 'school' && data.schoolId === schoolId)) {
          fetched.push({ id: calendarDoc.id, ...data } as Event);
        }
      });
      // Sort by date and time
      fetched.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      setEvents(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching events:', error);
      toast.error(language === 'en' ? 'Failed to load events' : 'فشل في تحميل الأحداث');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.schoolId, user?.school, language]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'exam': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'holiday': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting': return language === 'en' ? 'Meeting' : 'اجتماع';
      case 'exam': return language === 'en' ? 'Exam' : 'امتحان';
      case 'holiday': return language === 'en' ? 'Holiday' : 'عطلة';
      default: return language === 'en' ? 'Other' : 'أخرى';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Calendar & Events' : 'التقويم والأحداث'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'View school events and schedule' : 'عرض الأحداث والجدول المدرسي'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading events...' : 'جاري تحميل الأحداث...'}
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No events found.' : 'لم يتم العثور على أحداث.'}</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getTypeColor(event.type)}`}>
                      {getTypeLabel(event.type)}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {event.description}
              </p>

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{event.date} {language === 'en' ? 'at' : 'في'} {event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
