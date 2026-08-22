import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, getDoc, deleteDoc, deleteField, runTransaction } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useStore, Role } from '../../lib/store';
import { BookOpen, AlertCircle } from 'lucide-react';
import { ARAB_COUNTRIES, SCHOOL_SYSTEMS, GRADES } from '../../lib/constants';
import { yemenGovernorates } from '../../lib/yemenData';
import { getGradeKey, getGradeLabelAr, YEMEN_GRADE_OPTIONS } from '../../lib/gradeCatalog';
import { createStableKey, normalizePersonName } from '../../lib/utils';
import { clearRegistrationDraft, readRegistrationDraft } from '../../lib/emailLinkAuth';

const FIRESTORE_OPERATION_TIMEOUT_MS = 10000;

function firebaseErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

function isFirestoreDatabaseUnavailable(error: unknown): boolean {
  const code = firebaseErrorCode(error);
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    code === 'not-found' ||
    (code === 'failed-precondition' && /database|firestore/i.test(message)) ||
    /database.*(does not exist|not found|not enabled)/i.test(message)
  );
}

function withFirestoreTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), FIRESTORE_OPERATION_TIMEOUT_MS);
    operation.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (reason) => {
        clearTimeout(timeoutId);
        reject(reason);
      },
    );
  });
}

export default function Onboarding() {
  const { user, setUser, language, isAuthReady } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSchools, setAvailableSchools] = useState<any[]>([]);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [firestoreUnavailable, setFirestoreUnavailable] = useState(false);
  const [schoolMode, setSchoolMode] = useState<'registered' | 'new' | 'none'>('none');

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
    studentIdentifier: '',
  });

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user || !user.needsOnboarding) {
      navigate('/');
    } else {
      const draft = readRegistrationDraft();
      const sameEmail = draft?.email && user?.email && draft.email.toLowerCase() === user.email.toLowerCase();
      if (sameEmail) {
        setFormData(prev => ({ ...prev, name: draft.name || prev.name, phoneNumber: draft.phoneNumber || prev.phoneNumber }));
      } else if (user.name) {
        setFormData(prev => ({ ...prev, name: user.name }));
      }
    }
    fetchSchools();
  }, [user, isAuthReady, navigate]);

  const fetchSchools = async () => {
    setError('');
    setFirestoreUnavailable(false);
    try {
      const snapshot = await withFirestoreTimeout(getDocs(collection(db, 'schools')));
      const schools = snapshot.docs.map(schoolDoc => ({ id: schoolDoc.id, ...schoolDoc.data() }));
      setAvailableSchools(schools);
    } catch (err) {
      console.error('Error fetching schools:', err);
      const timedOut = err instanceof Error && err.message === 'FIRESTORE_TIMEOUT';
      if (isFirestoreDatabaseUnavailable(err) || timedOut) {
        setFirestoreUnavailable(true);
        setError(language === 'en'
          ? 'Firestore is unavailable. Create the default Firestore database, deploy firestore.rules, then retry.'
          : 'قاعدة Firestore غير متاحة. أنشئ قاعدة Firestore الافتراضية، وانشر firestore.rules، ثم أعد المحاولة.');
      } else {
        setError(language === 'en'
          ? 'Unable to load schools. Check your connection and retry.'
          : 'تعذر تحميل المدارس. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
      }
    } finally {
      setSchoolsLoaded(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'role') {
      setSchoolMode(value === 'principal' ? 'new' : value === 'student' ? 'none' : 'registered');
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
    if (!auth.currentUser) {
      setError(language === 'en'
        ? 'Your session has expired. Please sign in again.'
        : 'انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.');
      navigate('/login', { replace: true });
      return;
    }

    if (firestoreUnavailable) {
      setError(language === 'en'
        ? 'Firestore is not configured for this Firebase project. Create the default Firestore database, deploy the rules, then try again.'
        : 'قاعدة Firestore غير مهيأة في مشروع Firebase. أنشئ قاعدة Firestore الافتراضية، ثم انشر القواعد وحاول مرة أخرى.');
      return;
    }

    setError('');
    const normalizedName = normalizePersonName(formData.name || auth.currentUser.displayName || '');
    if (normalizedName.split(/\s+/).filter(Boolean).length < 2) {
      setError(language === 'en'
        ? 'Please enter at least your first name and family name.'
        : 'يرجى إدخال الاسم الأول واسم العائلة على الأقل. ويمكن استكمال الاسم لاحقاً.');
      return;
    }

    if (formData.role === 'student' && !formData.grade) {
      setError(language === 'en' ? 'Please select your grade.' : 'يرجى اختيار الصف قبل المتابعة.');
      return;
    }

    setLoading(true);
    let createdSchoolId: string | null = null;
    let createdClaimId: string | null = null;
    let assignedStudentIdentifier = '';
    let profileSaved = false;

    try {
      let finalSchoolName = normalizePersonName(formData.school);
      let finalSchoolId = formData.schoolId || '';
      let assignedStudentData: Record<string, any> | null = null;
      let roleInvitationData: Record<string, any> | null = null;
      let assignedSchoolData: Record<string, any> | null = null;
      if (formData.role === 'student' && formData.studentIdentifier.trim()) {
        assignedStudentIdentifier = formData.studentIdentifier.trim().toUpperCase();
        const identifierSnapshot = await withFirestoreTimeout(getDoc(doc(db, 'studentIds', assignedStudentIdentifier)));
        if (!identifierSnapshot.exists()) throw new Error('INVALID_STUDENT_IDENTIFIER');
        assignedStudentData = identifierSnapshot.data();
        if (assignedStudentData.status !== 'available') throw new Error('USED_STUDENT_IDENTIFIER');
        const assignedNameKey = assignedStudentData.nameKey || createStableKey(normalizePersonName(String(assignedStudentData.studentName || '')));
        if (assignedNameKey !== createStableKey(normalizedName)) throw new Error('STUDENT_IDENTIFIER_NAME_MISMATCH');
        finalSchoolId = String(assignedStudentData.schoolId || '');
        const assignedSchool = availableSchools.find((school) => school.id === finalSchoolId);
        if (assignedSchool) {
          assignedSchoolData = assignedSchool;
          finalSchoolName = normalizePersonName(String(assignedSchool.name || ''));
        } else if (finalSchoolId) {
          const assignedSchoolSnapshot = await withFirestoreTimeout(getDoc(doc(db, 'schools', finalSchoolId)));
          if (assignedSchoolSnapshot.exists()) {
            assignedSchoolData = { id: assignedSchoolSnapshot.id, ...assignedSchoolSnapshot.data() };
            finalSchoolName = normalizePersonName(String(assignedSchoolSnapshot.data().name || ''));
          }
        }
        if (!finalSchoolId || !finalSchoolName) throw new Error('STUDENT_SCHOOL_NOT_FOUND');
      }
      if (formData.role === 'teacher' || formData.role === 'principal') {
        const accountEmail = String(auth.currentUser.email || '').trim().toLowerCase();
        const invitationSnapshot = await withFirestoreTimeout(getDoc(doc(db, 'roleInvitationsByEmail', accountEmail)));
        if (!invitationSnapshot.exists()) throw new Error('ROLE_INVITATION_REQUIRED');
        roleInvitationData = invitationSnapshot.data();
        if (roleInvitationData.email !== accountEmail || roleInvitationData.role !== formData.role) throw new Error('ROLE_INVITATION_MISMATCH');
        if (roleInvitationData.status !== 'approved') throw new Error('ROLE_INVITATION_PENDING');
        finalSchoolId = String(roleInvitationData.schoolId || '');
        const assignedSchool = availableSchools.find((school) => school.id === finalSchoolId);
        if (assignedSchool) {
          assignedSchoolData = assignedSchool;
          finalSchoolName = normalizePersonName(String(assignedSchool.name || ''));
        } else if (finalSchoolId) {
          const assignedSchoolSnapshot = await withFirestoreTimeout(getDoc(doc(db, 'schools', finalSchoolId)));
          if (assignedSchoolSnapshot.exists()) {
            assignedSchoolData = { id: assignedSchoolSnapshot.id, ...assignedSchoolSnapshot.data() };
            finalSchoolName = normalizePersonName(String(assignedSchoolSnapshot.data().name || ''));
          }
        }
        if (!finalSchoolId || !finalSchoolName) throw new Error('ROLE_SCHOOL_NOT_FOUND');
      }
      const linkedAssignmentData = assignedStudentData || roleInvitationData;
      const effectiveCountry = String(linkedAssignmentData?.country || assignedSchoolData?.country || formData.country);
      const effectiveCity = String(linkedAssignmentData?.city || assignedSchoolData?.city || assignedSchoolData?.governorate || formData.city);
      const effectiveDistrict = String(linkedAssignmentData?.district || assignedSchoolData?.district || formData.district);
      const effectiveSchoolSystem = String(linkedAssignmentData?.schoolSystem || assignedSchoolData?.system || formData.schoolSystem);
      const selectedGovernorate = effectiveCountry === 'اليمن'
        ? yemenGovernorates.find((governorate) => governorate.nameAr === effectiveCity)
        : undefined;
      const selectedDistrict = selectedGovernorate?.districts.find((district) => district.nameAr === effectiveDistrict);
      const selectedSchool = filteredSchools.find((school) => school.id === formData.schoolId);

      let schoolApprovalStatus: 'pending' | 'approved' | 'rejected' = 'approved';
      let schoolStatus: 'pending' | 'active' | 'rejected' | 'none' = 'none';

      if (['student', 'teacher', 'principal'].includes(formData.role)) {
        if (formData.role === 'student' && assignedStudentData) {
          schoolApprovalStatus = 'approved';
          schoolStatus = 'active';
        } else if ((formData.role === 'teacher' || formData.role === 'principal') && roleInvitationData) {
          schoolApprovalStatus = 'approved';
          schoolStatus = 'active';
        } else if (schoolMode === 'registered' && selectedSchool) {
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

          const schoolKey = createStableKey(formData.country, formData.city, formData.district, finalSchoolName, formData.schoolSystem);
          finalSchoolId = `school_pending_${schoolKey}`;
          createdSchoolId = finalSchoolId;
          schoolApprovalStatus = 'pending';
          schoolStatus = 'pending';
          await withFirestoreTimeout(setDoc(doc(db, 'schools', finalSchoolId), {
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
          }));
        } else if (formData.role === 'student') {
          // Students may enter the platform before receiving a school-issued ID.
          // Their account remains pending until an administrator links a school and ID.
          finalSchoolId = '';
          finalSchoolName = '';
          schoolApprovalStatus = 'pending';
          schoolStatus = 'pending';
        } else {
          throw new Error(language === 'en'
            ? 'Select a registered school or choose “My school is not listed” to submit a new school for approval.'
            : 'اختر مدرسة مسجلة أو اختر «مدرستي غير موجودة» لإرسال طلب إضافة مدرسة للاعتماد.');
        }
      }

      const gradeKey = formData.role === 'student' && assignedStudentData?.gradeKey
        ? String(assignedStudentData.gradeKey)
        : getGradeKey(formData.grade);
      const registrationKey = formData.role === 'student'
        ? createStableKey(effectiveCountry, effectiveCity, effectiveDistrict, finalSchoolId, gradeKey, normalizedName)
        : '';

      if (formData.role === 'student' && finalSchoolId) {
        const claimId = `student_${registrationKey}`;
        const claimRef = doc(db, 'studentRegistrationClaims', claimId);
        await withFirestoreTimeout(runTransaction(db, async (transaction) => {
          const claimSnapshot = await transaction.get(claimRef);
          const identifierRef = doc(db, 'studentIds', assignedStudentIdentifier);
          const identifierSnapshot = await transaction.get(identifierRef);
          if (claimSnapshot.exists()) {
            throw new Error('DUPLICATE_STUDENT');
          }
          if (!identifierSnapshot.exists() || identifierSnapshot.data().status !== 'available') {
            throw new Error('USED_STUDENT_IDENTIFIER');
          }
          transaction.update(identifierRef, {
            status: 'assigned',
            linkedUserId: auth.currentUser?.uid,
            linkedAt: new Date().toISOString(),
          });
          transaction.set(claimRef, {
            uid: auth.currentUser?.uid,
            role: 'student',
            country: effectiveCountry,
            city: effectiveCity,
            district: effectiveDistrict,
            districtId: selectedDistrict?.id || '',
            schoolId: finalSchoolId,
            gradeKey,
            nameKey: createStableKey(normalizedName),
            createdAt: new Date().toISOString(),
          });
        }));
        createdClaimId = claimId;
      }

      const userData = {
        uid: auth.currentUser.uid,
        email: String(auth.currentUser.email || '').trim().toLowerCase(),
        name: normalizedName,
        nameKey: createStableKey(normalizedName),
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        country: effectiveCountry,
        city: effectiveCity,
        district: effectiveDistrict,
        districtId: selectedDistrict?.id || '',
        governorate: effectiveCity,
        governorateId: selectedGovernorate?.id || '',
        school: finalSchoolName,
        schoolId: finalSchoolId,
        schoolSystem: effectiveSchoolSystem,
        classId: formData.role === 'student' ? String(assignedStudentData?.classId || '') : '',
        teacherIds: formData.role === 'student' && Array.isArray(assignedStudentData?.teacherIds) ? assignedStudentData.teacherIds : [],
        curriculumIds: formData.role === 'student' && Array.isArray(assignedStudentData?.curriculumIds) ? assignedStudentData.curriculumIds : [],
        parentId: formData.role === 'student' ? String(assignedStudentData?.parentId || '') : '',
        subjectKey: (formData.role === 'teacher' && roleInvitationData?.subjectKey) ? String(roleInvitationData.subjectKey) : '',
        invitationId: roleInvitationData?.invitationId || '',
        schoolApprovalStatus,
        schoolStatus,
        grade: formData.role === 'student' ? getGradeLabelAr(gradeKey) : formData.grade,
        gradeKey,
        studentRegistrationKey: formData.role === 'student' ? (createdClaimId || '') : '',
        studentIdentifier: formData.role === 'student' ? assignedStudentIdentifier : '',
        createdAt: new Date().toISOString(),
      };

      await withFirestoreTimeout(setDoc(doc(db, 'users', auth.currentUser.uid), userData));
      profileSaved = true;
      setUser({ ...userData, needsOnboarding: false } as any);
      clearRegistrationDraft();
      navigate(`/${formData.role}`, { replace: true });
    } catch (err: any) {
      // Cleanup runs in the background so a rejected delete cannot keep the submit button spinning.
      if (createdClaimId && !profileSaved) {
        void deleteDoc(doc(db, 'studentRegistrationClaims', createdClaimId)).catch(() => undefined);
      }
      if (assignedStudentIdentifier && !profileSaved) {
        void setDoc(doc(db, 'studentIds', assignedStudentIdentifier), {
          status: 'available',
          linkedUserId: deleteField(),
          linkedAt: deleteField(),
        }, { merge: true }).catch(() => undefined);
      }
      if (createdSchoolId && !profileSaved) {
        void deleteDoc(doc(db, 'schools', createdSchoolId)).catch(() => undefined);
      }
      if (err.message === 'INVALID_STUDENT_IDENTIFIER') {
        setError(language === 'en' ? 'This student ID does not exist. Ask your school administrator for a valid ID.' : 'معرف الطالب غير موجود. اطلب من إدارة المدرسة معرفاً صحيحاً.');
      } else if (err.message === 'USED_STUDENT_IDENTIFIER') {
        setError(language === 'en' ? 'This student ID has already been linked to an account.' : 'معرف الطالب هذا مرتبط بحساب آخر بالفعل.');
      } else if (err.message === 'STUDENT_IDENTIFIER_NAME_MISMATCH') {
        setError(language === 'en' ? 'The four-part name does not match the name assigned to this student ID.' : 'الاسم الرباعي لا يطابق الاسم المسجل على معرف الطالب.');
      } else if (err.message === 'STUDENT_SCHOOL_NOT_FOUND') {
        setError(language === 'en' ? 'The school linked to this student ID is unavailable. Contact the administrator.' : 'المدرسة المرتبطة بهذا المعرف غير متاحة. تواصل مع الأدمن.');
      } else if (err.message === 'ROLE_INVITATION_REQUIRED') {
        setError(language === 'en' ? 'This role is assigned by the platform administrator. Ask your administrator to issue an invitation for this email.' : 'هذا الدور يمنحه الأدمن فقط. اطلب من إدارة المنصة إصدار دعوة لهذا البريد الإلكتروني.');
      } else if (err.message === 'ROLE_INVITATION_PENDING') {
        setError(language === 'en' ? 'Your administrator invitation is still pending approval.' : 'دعوة الأدمن الخاصة بك ما زالت قيد المراجعة ولم تعتمد بعد.');
      } else if (err.message === 'ROLE_INVITATION_MISMATCH') {
        setError(language === 'en' ? 'This account is not authorized for the selected role. Use the invited email and role.' : 'هذا الحساب غير مخول بالدور المحدد. استخدم البريد والدور الواردين في دعوة الأدمن.');
      } else if (err.message === 'ROLE_SCHOOL_NOT_FOUND') {
        setError(language === 'en' ? 'The school assigned by the administrator is unavailable.' : 'المدرسة التي ربطها الأدمن بهذا الحساب غير متاحة.');
      } else if (err.message === 'DUPLICATE_STUDENT') {
        setError(language === 'en'
          ? 'This four-part name is already registered in the selected school and grade.'
          : 'هذا الاسم الرباعي مسجل مسبقاً في المدرسة والصف المحددين.');
      } else if (isFirestoreDatabaseUnavailable(err)) {
        setFirestoreUnavailable(true);
        setError(language === 'en'
          ? 'Firestore is not configured for this Firebase project. Create the default Firestore database, deploy the rules, then try again.'
          : 'قاعدة Firestore غير مهيأة في مشروع Firebase. أنشئ قاعدة Firestore الافتراضية، ثم انشر القواعد وحاول مرة أخرى.');
      } else if (err.message === 'FIRESTORE_TIMEOUT') {
        setError(language === 'en'
          ? 'The save request timed out. Deploy the latest Firestore rules and check your internet connection before trying again.'
          : 'انتهت مهلة الحفظ. يرجى نشر أحدث قواعد Firestore والتحقق من اتصال الإنترنت ثم المحاولة مرة أخرى.');
      } else if (firebaseErrorCode(err) === 'permission-denied') {
        setError(language === 'en'
          ? 'Firebase rejected the save. Deploy firestore.rules and verify that the signed-in account has permission.'
          : 'رفض Firebase عملية الحفظ. انشر ملف firestore.rules وتأكد من أن الحساب المسجل يملك الصلاحية.');
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
    if (schoolsLoaded && formData.role !== 'principal' && formData.role !== 'teacher' && filteredSchools.length === 0) {
      setSchoolMode(formData.role === 'student' ? 'none' : 'new');
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
            {firestoreUnavailable && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">{language === 'en' ? 'Firebase setup is incomplete' : 'إعداد Firebase غير مكتمل'}</p>
                <p className="mt-1">
                  {language === 'en'
                    ? 'The app is connected to project mukhtaruv, but its default Firestore database was not found. Create Firestore Database in Firebase Console, deploy firestore.rules, then retry.'
                    : 'التطبيق متصل بمشروع mukhtaruv، لكن قاعدة Firestore الافتراضية غير موجودة. أنشئ قاعدة Firestore من Firebase Console، وانشر firestore.rules، ثم أعد المحاولة.'}
                </p>
                <button
                  type="button"
                  onClick={fetchSchools}
                  className="mt-3 rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  {language === 'en' ? 'Retry Firebase connection' : 'إعادة محاولة الاتصال بـ Firebase'}
                </button>
              </div>
            )}
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

              {formData.role === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {language === 'en' ? 'Student ID (optional)' : 'معرف الطالب (اختياري)' }
                  </label>
                  <input
                    type="text"
                    name="studentIdentifier"
                    value={formData.studentIdentifier}
                    onChange={handleChange}
                    placeholder={language === 'en' ? 'Optional school-issued code' : 'رمز المدرسة (اختياري)'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 uppercase focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {language === 'en' ? 'Your ID automatically links you to your school, class, teachers and curriculum.' : 'يربطك المعرف تلقائياً بمدرستك وصفك ومعلميك ومنهجك.'}
                  </p>
                </div>
              )}

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

                  {formData.role !== 'student' && (
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
                        {formData.role === 'student' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSchoolMode('none');
                              setFormData(prev => ({ ...prev, school: '', schoolId: '' }));
                            }}
                            className={`rounded-md border px-3 py-2 text-sm ${schoolMode === 'none' ? 'border-slate-600 bg-slate-100 text-slate-800' : 'border-gray-300 text-gray-700'}`}
                          >
                            {language === 'en' ? 'Link my school later' : 'سأربط المدرسة لاحقاً'}
                          </button>
                        )}
                      </div>
                    )}

                    {schoolMode === 'registered' && formData.role !== 'principal' ? (
                      <select
                        name="schoolId"
                        required={formData.role !== 'student'}
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
                    ) : schoolMode === 'new' ? (
                      <input
                        type="text"
                        name="school"
                        required
                        value={formData.school}
                        onChange={handleChange}
                        placeholder={language === 'en' ? 'Enter the school name' : 'أدخل اسم المدرسة'}
                        className="mt-2 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        {language === 'en'
                          ? 'You can create your student account now. The administrator will link your school, class, and student code later.'
                          : 'يمكنك إنشاء حساب الطالب الآن، ثم يربط الأدمن المدرسة والشعبة ورمز الطالب لاحقاً.'}
                      </div>
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
                  )}
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
