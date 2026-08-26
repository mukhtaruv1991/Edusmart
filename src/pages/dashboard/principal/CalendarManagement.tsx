import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, MapPin } from 'lucide-react';
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

export default function CalendarManagement() {
  const { user, language } = useStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'meeting' | 'exam' | 'holiday' | 'other'>('meeting');

  useEffect(() => {
    const schoolId = user?.schoolId || user?.school;
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'academicCalendar'),
      where('scope', '==', 'school'),
      where('schoolId', '==', schoolId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Event[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Event);
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
  }, [user?.uid, user?.schoolId, user?.school, language]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = user?.schoolId || user?.school;
    if (!schoolId || !user?.uid) return;

    try {
      await addDoc(collection(db, 'academicCalendar'), {
        title,
        description,
        date,
        time,
        location,
        type,
        scope: 'school',
        schoolId,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'en' ? 'Event added successfully' : 'تم إضافة الحدث بنجاح');
      setIsAdding(false);
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setLocation('');
      setType('meeting');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error(language === 'en' ? 'Failed to add event' : 'فشل في إضافة الحدث');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this event?' : 'هل أنت متأكد أنك تريد حذف هذا الحدث؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success(language === 'en' ? 'Event deleted successfully' : 'تم حذف الحدث بنجاح');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(language === 'en' ? 'Failed to delete event' : 'فشل في حذف الحدث');
    }
  };

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
            {language === 'en' ? 'Manage school events and schedule' : 'إدارة الأحداث والجدول المدرسي'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Add Event' : 'إضافة حدث'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {language === 'en' ? 'Add New Event' : 'إضافة حدث جديد'}
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
                  {language === 'en' ? 'Type' : 'النوع'}
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="meeting">{language === 'en' ? 'Meeting' : 'اجتماع'}</option>
                  <option value="exam">{language === 'en' ? 'Exam' : 'امتحان'}</option>
                  <option value="holiday">{language === 'en' ? 'Holiday' : 'عطلة'}</option>
                  <option value="other">{language === 'en' ? 'Other' : 'أخرى'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Date' : 'التاريخ'}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Time' : 'الوقت'}
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Location' : 'الموقع'}
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., Main Hall' : 'مثال: القاعة الرئيسية'}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'Description' : 'الوصف'}
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
                {language === 'en' ? 'Save Event' : 'حفظ الحدث'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
