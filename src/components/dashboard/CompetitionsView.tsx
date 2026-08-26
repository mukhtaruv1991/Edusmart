import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Calendar, ChevronLeft, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { useStore } from '../../lib/store';

interface Competition {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  type?: 'academic' | 'sports' | 'arts' | 'other';
  status?: 'upcoming' | 'ongoing' | 'completed';
  school?: string;
  schoolId?: string;
  targetAudience?: 'school' | 'grade' | 'class';
  gradeKey?: string;
  classId?: string;
}

export default function CompetitionsView() {
  const { user, language } = useStore();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const competitionsRef = collection(db, 'competitions');
    const competitionsQuery = user.schoolId
      ? query(competitionsRef, where('schoolId', '==', user.schoolId))
      : query(competitionsRef, where('school', '==', user.school || ''));
    const unsubscribe = onSnapshot(competitionsQuery, (snapshot) => {
      const currentUser = user as unknown as { gradeKey?: string; grade?: string; classId?: string };
      const currentGrade = currentUser.gradeKey || currentUser.grade || '';
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Competition));
      setCompetitions(next.filter((competition) => {
        if (competition.targetAudience === 'grade') return !competition.gradeKey || competition.gradeKey === 'all' || competition.gradeKey === currentGrade;
        if (competition.targetAudience === 'class') return Boolean(currentUser.classId && competition.classId === currentUser.classId);
        return true;
      }));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching competitions:', error);
      toast.error(language === 'ar' ? 'فشل في تحميل المسابقات' : 'Failed to load competitions');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [language, user?.school, user?.schoolId, user?.uid]);

  const getStatus = (competition: Competition) => {
    const now = Date.now();
    const start = competition.startDate ? new Date(competition.startDate).getTime() : 0;
    const end = competition.endDate ? new Date(competition.endDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (competition.status === 'completed' || now > end) return 'completed';
    if (competition.status === 'ongoing' || (start && now >= start && now <= end)) return 'ongoing';
    return 'upcoming';
  };

  const statusLabel = (status: string) => ({
    upcoming: language === 'ar' ? 'قادمة' : 'Upcoming',
    ongoing: language === 'ar' ? 'جارية الآن' : 'Ongoing',
    completed: language === 'ar' ? 'مكتملة' : 'Completed',
  }[status] || status);

  const statusClass = (status: string) => status === 'ongoing'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : status === 'completed'
      ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';

  return (
    <div className="space-y-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><Trophy className="h-6 w-6 text-blue-600" />{language === 'ar' ? 'المسابقات' : 'Competitions'}</h1><p className="mt-1 text-gray-500 dark:text-gray-400">{language === 'ar' ? 'شارك في مسابقات مدرستك وشاهد لوحة الصدارة.' : 'Join school competitions and view the leaderboard.'}</p></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? <div className="col-span-full py-8 text-center text-gray-500">{language === 'ar' ? 'جاري تحميل المسابقات...' : 'Loading competitions...'}</div> : competitions.length === 0 ? <div className="col-span-full rounded-2xl border border-gray-100 bg-white py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800"><Trophy className="mx-auto mb-3 h-12 w-12 text-gray-400" /><p>{language === 'ar' ? 'لا توجد مسابقات منشورة لمدرستك حالياً.' : 'No published competitions for your school.'}</p></div> : competitions.map((competition) => { const status = getStatus(competition); return <Link key={competition.id} to={user?.role === 'student' ? `/student/competitions/${competition.id}` : `/teacher/competitions/${competition.id}`} className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><Trophy className="h-6 w-6" /></div><div><h3 className="font-bold text-gray-900 dark:text-white">{competition.title}</h3><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>{statusLabel(status)}</span></div></div><ChevronLeft className="h-5 w-5 text-gray-400 transition group-hover:-translate-x-1" /></div><p className="mt-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{competition.description || (language === 'ar' ? 'مسابقة تعليمية تفاعلية.' : 'Interactive learning competition.')}</p><div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"><Calendar className="h-4 w-4" />{competition.startDate || competition.endDate ? `${competition.startDate || '-'} — ${competition.endDate || '-'}` : (language === 'ar' ? 'موعد يحدد لاحقاً' : 'Schedule pending')}</div></Link>; })}
      </div>
    </div>
  );
}
