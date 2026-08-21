import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useStore, Role } from '../../lib/store';
import { BookOpen, AlertCircle } from 'lucide-react';
import { ARAB_COUNTRIES, SCHOOL_SYSTEMS, GRADES } from '../../lib/constants';
import { yemenGovernorates } from '../../lib/yemenData';
import { getGradeKey, YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';

export default function Onboarding() {
  const { user, setUser, language, isAuthReady } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSchools, setAvailableSchools] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    role: 'student' as Role,
    phoneNumber: '',
    country: 'اليمن',
    city: 'صنعاء',
    district: '',
    school: '',
    schoolId: '',
    grade: YEMEN_GRADE_OPTIONS[0].labelAr,
    schoolSystem: SCHOOL_SYSTEMS[0],
  });

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user || !user.needsOnboarding) {
      navigate('/');
    } else if (user.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
    fetchSchools();
  }, [user, isAuthReady, navigate]);

  const fetchSchools = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'schools'));
      const schools = snapshot.docs.map(schoolDoc => ({ id: schoolDoc.id, ...schoolDoc.data() }));
      setAvailableSchools(schools);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'city' ? { district: '', school: '', schoolId: '' } : {}),
      ...(name === 'district' ? { school: '', schoolId: '' } : {}),
    }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setFormData({
      ...formData,
      country: newCountry,
      city: newCountry === 'اليمن' ? 'صنعاء' : '',
      district: '',
      school: '',
      schoolId: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setError('');
    setLoading(true);

    try {
      let finalSchoolName = formData.school.trim();
      let finalSchoolId = formData.schoolId || '';
      const selectedGovernorate = isYemen
        ? yemenGovernorates.find((governorate) => governorate.nameAr === formData.city)
        : undefined;
      const selectedDistrict = selectedGovernorate?.districts.find((district) => district.nameAr === formData.district);
      const selectedSchool = availableSchools.find((school) => school.id === formData.schoolId);

      // Students and teachers must link to a real registered school. A principal may create one.
      if (['student', 'teacher', 'principal'].includes(formData.role)) {
        if (selectedSchool) {
          finalSchoolId = selectedSchool.id;
          finalSchoolName = String(selectedSchool.name || '').trim();
        } else if (formData.role === 'principal' && finalSchoolName) {
          finalSchoolId = `school_${auth.currentUser.uid}`;
          await setDoc(doc(db, 'schools', finalSchoolId), {
            id: finalSchoolId,
            name: finalSchoolName,
            country: formData.country,
            city: formData.city,
            district: formData.district,
            governorateId: selectedGovernorate?.id || '',
            districtId: selectedDistrict?.id || '',
            system: formData.schoolSystem,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString(),
          });
        } else {
          throw new Error(language === 'en'
            ? 'Select a registered school. A principal can register a new school.'
            : 'اختر مدرسة مسجلة من القائمة. يستطيع مدير المدرسة تسجيل مدرسة جديدة.');
        }
      }

      const userData = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        name: formData.name || auth.currentUser.displayName || 'User',
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        country: formData.country,
        city: formData.city,
        district: formData.district,
        districtId: selectedDistrict?.id || '',
        governorate: formData.city,
        governorateId: selectedGovernorate?.id || '',
        school: finalSchoolName,
        schoolId: finalSchoolId,
        schoolSystem: formData.schoolSystem,
        grade: formData.grade,
        gradeKey: getGradeKey(formData.grade),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', auth.currentUser.uid), userData);
      setUser(userData as any);
      navigate('/');
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('offline')) {
        setError(language === 'en' 
          ? 'Network Error: Cannot save profile. Please check your device date/time, disable your AdBlocker, or open in a new tab.' 
          : 'حدث خطأ في الشبكة. يرجى التحقق من التاريخ والوقت بجهازك، أو إيقاف مانع الإعلانات، أو فتح التطبيق في نافذة جديدة.');
      } else {
        setError(err.message || 'Failed to complete profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isYemen = formData.country === 'اليمن';
  const yemenCities = yemenGovernorates.map((governorate) => governorate.nameAr);
  const selectedGovernorate = yemenGovernorates.find((governorate) => governorate.nameAr === formData.city);
  const yemenDistricts = isYemen && selectedGovernorate ? selectedGovernorate.districts : [];
  const selectedDistrict = selectedGovernorate?.districts.find((district) => district.nameAr === formData.district);
  const filteredSchools = availableSchools
    .filter((school) => {
      if (school.country && school.country !== formData.country) return false;
      if (formData.country !== 'اليمن') return true;
      const governorateMatches = school.governorateId
        ? school.governorateId === selectedGovernorate?.id
        : school.city === formData.city;
      const districtMatches = school.districtId
        ? school.districtId === selectedDistrict?.id
        : school.district === formData.district;
      return governorateMatches && districtMatches && String(school.name || '').trim();
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {language === 'en' ? 'Complete Your Profile' : 'أكمل بيانات حسابك'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {language === 'en' ? 'Please provide the following details to continue.' : 'يرجى تقديم التفاصيل التالية للمتابعة.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-s-4 border-red-400 p-4 flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ms-3 text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {language === 'en' ? 'Full Name' : 'الاسم الكامل'}
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {language === 'en' ? 'Role' : 'الدور'}
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="student">{language === 'en' ? 'Student' : 'طالب'}</option>
                  <option value="teacher">{language === 'en' ? 'Teacher' : 'معلم'}</option>
                  <option value="principal">{language === 'en' ? 'Principal' : 'مدير'}</option>
                  <option value="parent">{language === 'en' ? 'Parent' : 'ولي أمر'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {language === 'en' ? 'Phone Number' : 'رقم الهاتف'}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {language === 'en' ? 'Country' : 'الدولة'}
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleCountryChange}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {ARAB_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {isYemen ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'en' ? 'Governorate' : 'المحافظة'}
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {yemenCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'en' ? 'District' : 'المديرية'}
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">{language === 'en' ? 'Select District' : 'اختر المديرية'}</option>
                      {yemenDistricts.map(d => <option key={d.id} value={d.nameAr}>{d.nameAr}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {language === 'en' ? 'City' : 'المدينة'}
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              )}

              {/* Role-specific fields */}
              {(formData.role === 'student' || formData.role === 'teacher' || formData.role === 'principal') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'en' ? 'School System' : 'النظام المدرسي'}
                    </label>
                    <select
                      name="schoolSystem"
                      value={formData.schoolSystem}
                      onChange={handleChange}
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {SCHOOL_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'en' ? 'School/University' : 'المدرسة/الجامعة'}
                    </label>
                    {formData.role === 'principal' ? (
                      <input
                        type="text"
                        name="school"
                        required
                        value={formData.school}
                        onChange={handleChange}
                        placeholder={language === 'en' ? 'Enter your school name' : 'أدخل اسم المدرسة التي تديرها'}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <select
                        name="schoolId"
                        required
                        value={formData.schoolId}
                        onChange={(event) => {
                          const school = filteredSchools.find(item => item.id === event.target.value);
                          setFormData(prev => ({
                            ...prev,
                            schoolId: event.target.value,
                            school: school?.name || '',
                          }));
                        }}
                        className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">{language === 'en' ? 'Select a registered school' : 'اختر مدرسة مسجلة'}</option>
                        {filteredSchools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    )}
                    {formData.role !== 'principal' && filteredSchools.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        {language === 'en'
                          ? 'No registered school was found for this district. Ask the school principal to register it first.'
                          : 'لا توجد مدرسة مسجلة لهذه المديرية. اطلب من مدير المدرسة تسجيلها أولاً.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {formData.role === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {language === 'en' ? 'Grade/Level' : 'الصف/المستوى'}
                  </label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {(isYemen ? YEMEN_GRADE_OPTIONS.map(option => option.labelAr) : GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '...' : (language === 'en' ? 'Save & Continue' : 'حفظ ومتابعة')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
