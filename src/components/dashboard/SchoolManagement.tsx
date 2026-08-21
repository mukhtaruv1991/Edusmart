import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { collection, query, getDocs, doc, setDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Building2, Plus, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ARAB_COUNTRIES, YEMEN_GOVERNORATES, SCHOOL_SYSTEMS } from '../../lib/constants';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
  country: string;
  city: string;
  district?: string;
  system: string;
  createdAt: string;
  status?: 'pending' | 'approved' | 'active' | 'rejected';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  createdBy?: string;
}

export default function SchoolManagement() {
  const { language } = useStore();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    country: 'اليمن',
    city: 'صنعاء',
    district: '',
    system: SCHOOL_SYSTEMS[0],
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const q = query(collection(db, 'schools'));
      const snapshot = await getDocs(q);
      const fetchedSchools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
      setSchools(fetchedSchools);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error(language === 'en' ? 'Failed to fetch schools' : 'فشل في جلب المدارس');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setFormData({
      ...formData,
      country: newCountry,
      city: newCountry === 'اليمن' ? 'صنعاء' : '',
      district: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicates
    const isUniversity = formData.name.includes('جامع') || formData.name.includes('كلية') || formData.name.includes('معهد');
    const isBranch = formData.name.includes('فرع');
    
    const isDuplicate = schools.some(s => {
      if (s.country !== formData.country || s.city !== formData.city) return false;
      if (s.name.trim() === formData.name.trim()) {
        if (isUniversity && !isBranch) return true; // Universities/Institutes (not branches) are unique per governorate
        return s.district === formData.district; // Schools and University branches are unique per district
      }
      return false;
    });

    if (isDuplicate) {
      toast.error(language === 'en' ? 'This institution already exists in this area' : 'هذه المنشأة موجودة مسبقاً في هذه المنطقة');
      return;
    }

    setIsAdding(true);
    
    try {
      const schoolId = `school_${Date.now()}`;
      const newSchool: School = {
        id: schoolId,
        name: formData.name.trim(),
        country: formData.country,
        city: formData.city,
        district: formData.district,
        system: formData.system,
        status: 'approved',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'schools', schoolId), newSchool);
      setSchools([...schools, newSchool]);
      setFormData({ ...formData, name: '' });
      toast.success(language === 'en' ? 'School added successfully' : 'تمت إضافة المدرسة بنجاح');
    } catch (error) {
      console.error('Error adding school:', error);
      toast.error(language === 'en' ? 'Failed to add school' : 'فشل في إضافة المدرسة');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSchoolApproval = async (schoolId: string, status: 'approved' | 'rejected') => {
    try {
      const schoolRef = doc(db, 'schools', schoolId);
      const usersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
      const usersSnapshot = await getDocs(usersQuery);
      const batch = writeBatch(db);
      const reviewedAt = new Date().toISOString();

      batch.update(schoolRef, {
        status,
        approvalStatus: status,
        isActive: status === 'approved',
        reviewedAt,
      });

      usersSnapshot.forEach((userDoc) => {
        batch.update(userDoc.ref, {
          schoolApprovalStatus: status,
          schoolStatus: status === 'approved' ? 'active' : 'rejected',
        });
      });

      await batch.commit();
      setSchools(prev => prev.map(school => school.id === schoolId
        ? { ...school, status, approvalStatus: status, isActive: status === 'approved' }
        : school
      ));
      toast.success(language === 'en'
        ? `School ${status === 'approved' ? 'approved' : 'rejected'} successfully`
        : status === 'approved' ? 'تم اعتماد المدرسة وتفعيل الحسابات المرتبطة بها' : 'تم رفض طلب المدرسة');
    } catch (error) {
      console.error('Error updating school approval:', error);
      toast.error(language === 'en' ? 'Failed to update school approval' : 'تعذر تحديث اعتماد المدرسة');
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this school?' : 'هل أنت متأكد أنك تريد حذف هذه المدرسة؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'schools', schoolId));
      setSchools(schools.filter(s => s.id !== schoolId));
      toast.success(language === 'en' ? 'School deleted successfully' : 'تم حذف المدرسة بنجاح');
    } catch (error) {
      console.error('Error deleting school:', error);
      toast.error(language === 'en' ? 'Failed to delete school' : 'فشل في حذف المدرسة');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isYemen = formData.country === 'اليمن';
  const yemenCities = Object.keys(YEMEN_GOVERNORATES);
  const yemenDistricts = isYemen && formData.city ? YEMEN_GOVERNORATES[formData.city] || [] : [];

  return (
    <div className="space-y-8">
      {/* Add School Form */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          {language === 'en' ? 'Add New School' : 'إضافة مدرسة جديدة'}
        </h3>
        <form onSubmit={handleAddSchool} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'School Name' : 'اسم المدرسة'}
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'School System' : 'النظام المدرسي'}
              </label>
              <select
                name="system"
                value={formData.system}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {SCHOOL_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'en' ? 'Country' : 'الدولة'}
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleCountryChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {ARAB_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {isYemen ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'en' ? 'Governorate' : 'المحافظة'}
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {yemenCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'en' ? 'District' : 'المديرية'}
                  </label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{language === 'en' ? 'Select District' : 'اختر المديرية'}</option>
                    {yemenDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'City' : 'المدينة'}
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {language === 'en' ? 'Add School' : 'إضافة مدرسة'}
            </button>
          </div>
        </form>
      </div>

      {/* Schools List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {language === 'en' ? 'Registered Schools' : 'المدارس المسجلة'}
        </h3>
        
        {schools.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            {language === 'en' ? 'No schools registered yet.' : 'لم يتم تسجيل أي مدارس بعد.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map(school => (
              <div key={school.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{school.name}</h4>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        school.status === 'pending' || school.approvalStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : school.status === 'rejected' || school.approvalStatus === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {school.status === 'pending' || school.approvalStatus === 'pending'
                          ? (language === 'en' ? 'Pending approval' : 'قيد الاعتماد')
                          : school.status === 'rejected' || school.approvalStatus === 'rejected'
                            ? (language === 'en' ? 'Rejected' : 'مرفوضة')
                            : (language === 'en' ? 'Approved' : 'معتمدة')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSchool(school.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title={language === 'en' ? 'Delete School' : 'حذف المدرسة'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p>{school.system}</p>
                    <p>{school.country} - {school.city} {school.district && `- ${school.district}`}</p>
                  </div>
                  {(school.status === 'pending' || school.approvalStatus === 'pending') && (
                    <div className="mt-4 flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <button
                        type="button"
                        onClick={() => handleSchoolApproval(school.id, 'approved')}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-2 py-2 text-xs font-medium text-white hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {language === 'en' ? 'Approve' : 'اعتماد'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSchoolApproval(school.id, 'rejected')}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-red-600 px-2 py-2 text-xs font-medium text-white hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                        {language === 'en' ? 'Reject' : 'رفض'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
