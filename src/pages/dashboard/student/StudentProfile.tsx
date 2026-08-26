import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Activity, Award, Book, Building2, Calendar, Check, Edit2, GraduationCap, Link2, Mail, MapPin, Phone, Star, Target, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';

interface Attempt {
  score?: number;
  total?: number;
  percentage?: number;
  subject?: string;
  completedAt?: unknown;
}

interface TeacherReview {
  teacherName?: string;
  rating?: number;
  comment?: string;
  createdAt?: unknown;
}

const toPercentage = (attempt: Attempt) => typeof attempt.percentage === 'number'
  ? attempt.percentage
  : attempt.total ? Math.round(((attempt.score || 0) / attempt.total) * 100) : 0;

const formatDate = (value: unknown, language: 'ar' | 'en') => {
  if (!value) return '-';
  const date = typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US');
};

export default function StudentProfile() {
  const { user, language } = useStore();
  const [profileData, setProfileData] = useState<Record<string, any> | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [competitionAttempts, setCompetitionAttempts] = useState<Attempt[]>([]);
  const [reviews, setReviews] = useState<TeacherReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const [profileSnapshot, examSnapshot, competitionSnapshot, reviewsSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getDocs(query(collection(db, 'examAttempts'), where('studentId', '==', user.uid))),
          getDocs(query(collection(db, 'competitionAttempts'), where('studentId', '==', user.uid))),
          getDocs(query(collection(db, 'studentReviews'), where('studentId', '==', user.uid))),
        ]);
        const data = (profileSnapshot.exists() ? profileSnapshot.data() : user) as Record<string, any>;
        setProfileData(data);
        setPhone(data.phone || data.phoneNumber || '');
        setAddress(data.address || '');
        setAttempts(examSnapshot.docs.map((item) => item.data() as Attempt));
        setCompetitionAttempts(competitionSnapshot.docs.map((item) => item.data() as Attempt));
        setReviews(reviewsSnapshot.docs.map((item) => item.data() as TeacherReview));
      } catch (error) {
        console.error('Error fetching student portfolio:', error);
        toast.error(language === 'en' ? 'Failed to load profile' : 'فشل في تحميل الملف الشخصي');
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, [language, user]);

  const academicAverage = useMemo(() => {
    if (!attempts.length) return 0;
    return Math.round(attempts.reduce((sum, attempt) => sum + toPercentage(attempt), 0) / attempts.length);
  }, [attempts]);
  const competitionAverage = useMemo(() => {
    if (!competitionAttempts.length) return 0;
    return Math.round(competitionAttempts.reduce((sum, attempt) => sum + toPercentage(attempt), 0) / competitionAttempts.length);
  }, [competitionAttempts]);
  const reviewAverage = useMemo(() => {
    const rated = reviews.filter((review) => typeof review.rating === 'number');
    if (!rated.length) return 0;
    return Math.round((rated.reduce((sum, review) => sum + (review.rating || 0), 0) / rated.length) * 10) / 10;
  }, [reviews]);
  const subjectStats = useMemo(() => {
    const grouped = new Map<string, number[]>();
    attempts.forEach((attempt) => {
      const subject = attempt.subject || (language === 'ar' ? 'اختبارات عامة' : 'General exams');
      grouped.set(subject, [...(grouped.get(subject) || []), toPercentage(attempt)]);
    });
    return [...grouped.entries()].map(([subject, values]) => ({ subject, average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), count: values.length })).sort((a, b) => b.average - a.average);
  }, [attempts, language]);

  const handleSave = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { phone, address });
      setProfileData((current) => ({ ...(current || {}), phone, address }));
      setIsEditing(false);
      toast.success(language === 'en' ? 'Profile updated successfully' : 'تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'en' ? 'Failed to update profile' : 'فشل في تحديث الملف الشخصي');
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500">{language === 'en' ? 'Loading profile...' : 'جاري تحميل الملف الشخصي...'}</div>;
  if (!profileData) return <div className="flex h-64 flex-col items-center justify-center text-gray-500"><User className="mb-3 h-12 w-12 opacity-50" /><p>{language === 'en' ? 'Profile not found.' : 'لم يتم العثور على الملف الشخصي.'}</p></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><User className="h-6 w-6 text-blue-600" />{language === 'en' ? 'My learning portfolio' : 'ملفي التعليمي'}</h1><p className="mt-1 text-gray-500 dark:text-gray-400">{language === 'en' ? 'Personal information, results, and learning progress' : 'معلوماتك الشخصية ونتائجك وتقدمك الدراسي'}</p></div>{!isEditing ? <button type="button" onClick={() => setIsEditing(true)} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"><Edit2 className="h-4 w-4" />{language === 'en' ? 'Edit profile' : 'تعديل الملف'}</button> : <div className="flex gap-2"><button type="button" onClick={() => { setIsEditing(false); setPhone(profileData.phone || ''); setAddress(profileData.address || ''); }} className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 dark:bg-gray-700 dark:text-gray-300"><X className="h-4 w-4" />{language === 'en' ? 'Cancel' : 'إلغاء'}</button><button type="button" onClick={() => void handleSave()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"><Check className="h-4 w-4" />{language === 'en' ? 'Save' : 'حفظ'}</button></div>}</div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><MetricCard icon={<Target className="h-5 w-5" />} label={language === 'ar' ? 'المعدل العام' : 'Academic average'} value={`${academicAverage}%`} color="blue" /><MetricCard icon={<Book className="h-5 w-5" />} label={language === 'ar' ? 'الاختبارات المنجزة' : 'Completed exams'} value={`${attempts.length}`} color="indigo" /><MetricCard icon={<Award className="h-5 w-5" />} label={language === 'ar' ? 'متوسط المسابقات' : 'Competition average'} value={`${competitionAverage}%`} color="amber" /><MetricCard icon={<Activity className="h-5 w-5" />} label={language === 'ar' ? 'محاولات المسابقات' : 'Competition attempts'} value={`${competitionAttempts.length}`} color="green" /></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'الأداء حسب المادة' : 'Performance by subject'}</h2>{subjectStats.length ? <div className="space-y-4">{subjectStats.map((item) => <div key={item.subject}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-gray-700 dark:text-gray-200">{item.subject}</span><span className="text-gray-500">{item.average}% · {item.count} {language === 'ar' ? 'محاولة' : 'attempts'}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className={`h-full rounded-full ${item.average >= 80 ? 'bg-green-500' : item.average >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${item.average}%` }} /></div></div>)}</div> : <p className="py-8 text-center text-sm text-gray-500">{language === 'ar' ? 'ستظهر الإحصاءات بعد إنجاز أول اختبار.' : 'Statistics will appear after your first exam.'}</p>}</section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'المعلومات الأكاديمية' : 'Academic information'}</h2><div className="space-y-4"><InfoRow icon={<Building2 className="h-5 w-5" />} label={language === 'ar' ? 'المدرسة' : 'School'} value={profileData.school || '-'} /><InfoRow icon={<GraduationCap className="h-5 w-5" />} label={language === 'ar' ? 'الصف' : 'Grade'} value={profileData.grade || '-'} /><InfoRow icon={<MapPin className="h-5 w-5" />} label={language === 'ar' ? 'المحافظة والمديرية' : 'Location'} value={[profileData.governorate, profileData.district].filter(Boolean).join(' / ') || '-'} /><InfoRow icon={<Calendar className="h-5 w-5" />} label={language === 'ar' ? 'تاريخ الانضمام' : 'Joined'} value={formatDate(profileData.createdAt, language)} /></div></section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'تقييمات المعلمين' : 'Teacher reviews'}</h2><div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"><Star className="h-4 w-4 fill-current" />{reviewAverage || '-'} / 5</div></div>{reviews.length ? <div className="grid gap-3 sm:grid-cols-2">{reviews.slice(0, 6).map((review, index) => <article key={`${review.teacherName || 'teacher'}-${index}`} className="rounded-xl border border-gray-100 p-4 dark:border-gray-700"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-gray-900 dark:text-white">{review.teacherName || (language === 'ar' ? 'معلم' : 'Teacher')}</p><div className="flex items-center gap-1 text-amber-500">{Array.from({ length: 5 }, (_, starIndex) => <Star key={starIndex} className={`h-3.5 w-3.5 ${starIndex < Math.round(review.rating || 0) ? 'fill-current' : ''}`} />)}</div></div>{review.comment ? <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{review.comment}</p> : null}<p className="mt-2 text-xs text-gray-400">{formatDate(review.createdAt, language)}</p></article>)}</div> : <p className="py-6 text-center text-sm text-gray-500">{language === 'ar' ? 'ستظهر تقييمات المعلمين عند إضافتها من المدرسة.' : 'Teacher reviews will appear when added by the school.'}</p>}</section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="mt-0.5 text-blue-600"><Link2 className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'الارتباط المدرسي' : 'School linkage'}</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{profileData.schoolStatus === 'active' || profileData.schoolApprovalStatus === 'approved' ? (language === 'ar' ? `الحساب مربوط بالمدرسة${profileData.studentIdentifier ? ` عبر ${profileData.studentIdentifier}` : ''}.` : 'Your account is linked to a school.') : (language === 'ar' ? 'أكمل ربط المدرسة والمعرف لتظهر المواد والصف والشعبة.' : 'Link your school and identifier to activate your curriculum and class.')}</p></div></div><Link to="/student/link-school" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"><Link2 className="h-4 w-4" />{language === 'ar' ? 'إدارة الربط' : 'Manage linkage'}</Link></div></section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'المعلومات الشخصية' : 'Personal information'}</h2><div className="grid gap-4 sm:grid-cols-2"><InfoRow icon={<User className="h-5 w-5" />} label={language === 'ar' ? 'الاسم' : 'Name'} value={profileData.name || user?.name || '-'} /><InfoRow icon={<Mail className="h-5 w-5" />} label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} value={profileData.email || user?.email || '-'} /><EditableInfo icon={<Phone className="h-5 w-5" />} label={language === 'ar' ? 'رقم الهاتف' : 'Phone'} value={phone} editing={isEditing} onChange={setPhone} /><EditableInfo icon={<MapPin className="h-5 w-5" />} label={language === 'ar' ? 'العنوان' : 'Address'} value={address} editing={isEditing} onChange={setAddress} /></div></section>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: 'blue' | 'indigo' | 'amber' | 'green' }) {
  const colors = { blue: 'bg-blue-100 text-blue-600', indigo: 'bg-indigo-100 text-indigo-600', amber: 'bg-amber-100 text-amber-600', green: 'bg-green-100 text-green-600' };
  return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex items-start gap-3"><span className="mt-0.5 text-gray-400">{icon}</span><div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="font-medium text-gray-900 dark:text-white">{value}</p></div></div>; }
function EditableInfo({ icon, label, value, editing, onChange }: { icon: ReactNode; label: string; value: string; editing: boolean; onChange: (value: string) => void }) { return <div className="flex items-start gap-3"><span className="mt-0.5 text-gray-400">{icon}</span><div className="min-w-0 flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>{editing ? <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" /> : <p className="font-medium text-gray-900 dark:text-white">{value || '-'}</p>}</div></div>; }
