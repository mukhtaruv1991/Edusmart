import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, deleteDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useStore, Role } from '../../lib/store';
import { BookOpen, AlertCircle } from 'lucide-react';
import { ARAB_COUNTRIES, SCHOOL_SYSTEMS, GRADES } from '../../lib/constants';
import { yemenGovernorates } from '../../lib/yemenData';
import { getGradeKey, YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';
import { createStableKey, isFourPartName, normalizePersonName } from '../../lib/utils';

export default function Onboarding() {
  const { user, setUser, language, isAuthReady } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSchools, setAvailableSchools] = useState<any[]>([]);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [schoolMode, setSchoolMode] = useState<'registered' | 'new'>('registered');

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
    } finally {
      setSchoolsLoaded(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'role') {
      setSchoolMode(value === 'principal' ? 'new' : 'registered');
    }
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'role' ? { school: '', schoolId: '' } : {}),
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
    const normalizedName = normalizePersonName(formData.name || auth.currentUser.displayName || '');
    if (!isFourPartName(normalizedName)) {
      setError(language === 'en'
        ? 'Please enter your full four-part name (four words).'
        : 'يرجى إدخال الاسم الرباعي كاملاً (أربع كلمات).');
      return;
    }

    setLoading(true);
    let createdSchoolId: string | null = null;
    let createdClaimId: string | null = null;
    let profileSaved = false;

    try {
      let finalSchoolName = normalizePersonName(formData.school);
      let finalSchoolId = formData.schoolId || '';
      const selectedGovernorate = isYemen
        ? yemenGovernorates.find((governorate) => governorate.nameAr === formData.city)
        : undefined;
      const selectedDistrict = selectedGovernorate?.districts.find((district) => district.nameAr === formData.district);
      const selectedSchool = registeredSchools.find((school) => school.id === formData.schoolId);

      let schoolApprovalStatus: 'pending' | 'approved' | 'rejected' = 'approved';
      let schoolStatus: 'pending' | 'active' | 'rejected' | 'none' = 'none';

      if (['student', 'teacher', 'principal'].includes(formData.role)) {
        if (schoolMode === 'registered' && selectedSchool) {
          finalSchoolId = selectedSchool.id;
          finalSchoolName = normalizePersonName(String(selectedSchool.name || ''));
          schoolApprovalStatus = selectedSchool.status === 'pending' ? 'pending' : 'approved';
          schoolStatus = selectedSchool.status === 'pending' ? 'pending' : 'active';
        } else if (schoolMode === 'new' && finalSchoolName) {
          if (finalSchoolName.length < 3) {
            throw new Error(language === 'en'
              ? 'Enter a valid school name (at least 3 characters).'
              : 'أدخل اسم مدرسة صحيحاً (ثلاثة أحرف على الأقل).');
          }

          finalSchoolId = `school_${auth.currentUser.uid}`;
          createdSchoolId = finalSchoolId;
          schoolApprovalStatus = 'pending';
          schoolStatus = 'pending';
          await setDoc(doc(db, 'schools', finalSchoolId), {
            id: finalSchoolId,
            name: finalSchoolName,
            country: formData.country,
            city: formData.city,
            district: formData.district,
            governorate: formData.city,
            governorateId: selectedGovernorate?.id || '',
            districtId: selectedDistrict?.id || '',
            system: formData.schoolSystem,
            status: 'pending',
            approvalStatus: 'pending',
            isActive: false,
            createdBy: auth.currentUser.uid,
            createdByRole: formData.role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          throw new Error(language === 'en'
            ? 'Select a registered school or choose “My school is not listed” to submit a new school for approval.'
            : 'اختر مدرسة مسجلة أو اختر «مدرستي غير موجودة» لإرسال طلب إضافة مدرسة للاعتماد.');
        }
      }

      const gradeKey = getGradeKey(formData.grade);
      const registrationKey = formData.role === 'student'
        ? createStableKey(formData.country, formData.city, formData.district, finalSchoolId, gradeKey, normalizedName)
        : '';

      if (formData.role === 'student' && finalSchoolId) {
        const claimId = `student_${registrationKey}`;
        const claimRef = doc(db, 'studentRegistrationClaims', claimId);
        await runTransaction(db, async (transaction) => {
          const claimSnapshot = await transaction.get(claimRef);
          if (claimSnapshot.exists()) {
            throw new Error('DUPLICATE_STUDENT');
          }
          transaction.set(claimRef, {
            uid: auth.currentUser?.uid,
            role: 'student',
            country: formData.country,
            city: formData.city,
            district: formData.district,
            districtId: selectedDistrict?.id || '',
            schoolId: finalSchoolId,
            gradeKey,
            nameKey: createStableKey(normalizedName),
            createdAt: new Date().toISOString(),
          });
        });
        createdClaimId = claimId;
      }

      const userData = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        name: normalizedName,
        nameKey: createStableKey(normalizedName),
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
        schoolApprovalStatus,
        schoolStatus,
        grade: formData.grade,
        gradeKey,
        studentRegistrationKey: registrationKey,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', auth.currentUser.uid), userData);
      profileSaved = true;
      setUser({ ...userData, needsOnboarding: false } as any);
      navigate(`/${formData.role}`, { replace: true });
    } catch (err: any) {
      if (createdClaimId && !profileSaved) {
        await deleteDoc(doc(db, 'studentRegistrationClaims', createdClaimId)).catch(() => undefined);
      }
      if (createdSchoolId && !profileSaved) {
        await deleteDoc(doc(db, 'schools', createdSchoolId)).catch(() => undefined);
      }

      if (err.message === 'DUPLICATE_STUDENT') {
        setError(language === 'en'
          ? 'This four-part name is already registered in the selected school and grade.'
          : 'هذا الاسم الرباعي مسجل مسبقاً في المدرسة والصف المحددين.');
      } else if (err.message?.toLowerCase().includes('offline')) {
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
  const registeredSchools = availableSchools.filter((school) =>
    school.status !== 'pending' &&
    school.approvalStatus !== 'pending' &&
    school.isActive !== false
  );
  const filteredSchools = registeredSchools
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

  useEffect(() => {
    if (schoolsLoaded && formData.role !== 'principal' && filteredSchools.length === 0) {
      setSchoolMode('new');
    }
  }, [schoolsLoaded, formData.role, formData.country, formData.city, formData.district, filteredSchools.length]);

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
                  placeholder={language === 'en' ? 'First Father Grandfather Family' : 'الاسم الأول اسم الأب اسم الجد اسم العائلة'}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {language === 'en' ? 'Enter four name parts: first name, father, grandfather, and family name.' : 'أدخل أربعة أجزاء: الاسم الأول، اسم الأب، اسم الجد، واسم العائلة.'}
                </p>
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

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'en' ? 'School/University' : 'المدرسة/الجامعة'}
                    </label>

                    {formData.role !== 'principal' && (
                      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={language === 'en' ? 'School selection mode' : 'طريقة اختيار المدرسة'}>
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolMode('registered');
                            setFormData(prev => ({ ...prev, school: '', schoolId: '' }));
                          }}
                          disabled={filteredSchools.length === 0}
                          className={`rounded-md border px-3 py-2 text-sm ${schoolMode === 'registered' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {language === 'en' ? 'Choose a registered school' : 'اختيار مدرسة مسجلة'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolMode('new');
                            setFormData(prev => ({ ...prev, school: '', schoolId: '' }));
                          }}
                          className={`rounded-md border px-3 py-2 text-sm ${schoolMode === 'new' ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-700'}`}
                        >
                          {language === 'en' ? 'My school is not listed' : 'مدرستي غير موجودة'}
                        </button>
                      </div>
                    )}

                    {schoolMode === 'registered' && formData.role !== 'principal' ? (
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
                        className="mt-2 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">{language === 'en' ? 'Select an approved school' : 'اختر مدرسة معتمدة'}</option>
                        {filteredSchools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="school"
                        required
                        value={formData.school}
                        onChange={handleChange}
                        placeholder={language === 'en' ? 'Enter the school name' : 'أدخل اسم المدرسة'}
                        className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    )}

                    {schoolMode === 'new' && (
                      <p className="mt-2 text-xs text-amber-700">
                        {language === 'en'
                          ? 'Your school will be saved as pending and reviewed by the app administrator. You can finish creating your account now.'
                          : 'سيتم حفظ المدرسة كطلب قيد الاعتماد ومراجعتها من قبل مدير التطبيق. يمكنك إكمال إنشاء حسابك الآن.'}
                      </p>
                    )}
                    {formData.role !== 'principal' && schoolMode === 'registered' && filteredSchools.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        {language === 'en'
                          ? 'No approved school was found for this location. Choose “My school is not listed” to submit a request.'
                          : 'لا توجد مدرسة معتمدة في هذا الموقع. اختر «مدرستي غير موجودة» لإرسال طلب إضافة مدرسة.'}
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
