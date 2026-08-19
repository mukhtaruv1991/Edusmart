import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trophy, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Competition {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'academic' | 'sports' | 'arts' | 'other';
  status: 'upcoming' | 'ongoing' | 'completed';
}

export default function CompetitionsView() {
  const { user, language } = useStore();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'competitions'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Competition[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Competition);
      });
      setCompetitions(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching competitions:', error);
      toast.error(language === 'en' ? 'Failed to load competitions' : 'فشل في تحميل المسابقات');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming': return language === 'en' ? 'Upcoming' : 'قادمة';
      case 'ongoing': return language === 'en' ? 'Ongoing' : 'جارية';
      case 'completed': return language === 'en' ? 'Completed' : 'مكتملة';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Competitions' : 'المسابقات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'View school competitions and events' : 'عرض المسابقات والفعاليات المدرسية'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {language === 'en' ? 'Loading competitions...' : 'جاري تحميل المسابقات...'}
          </div>
        ) : competitions.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{language === 'en' ? 'No competitions found.' : 'لم يتم العثور على مسابقات.'}</p>
          </div>
        ) : (
          competitions.map((comp) => (
            <div key={comp.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {comp.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getStatusColor(comp.status)}`}>
                      {getStatusLabel(comp.status)}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {comp.description}
              </p>

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{comp.startDate} - {comp.endDate}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
