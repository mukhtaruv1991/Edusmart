import type { Role, UserProfile } from './store';

export type DemoAccount = UserProfile & {
  password: string;
  label: string;
};

const DEMO_SCHOOL_ID = 'demo_school_sanaa';
const DEMO_SCHOOL = 'مدرسة EduSmart التجريبية';
const DEMO_LOCATION = {
  country: 'اليمن',
  city: 'صنعاء',
  governorate: 'صنعاء',
  district: 'أمانة العاصمة',
  governorateId: 'sanaa',
  districtId: 'amanat_alasimah',
  schoolId: DEMO_SCHOOL_ID,
  school: DEMO_SCHOOL,
  schoolSystem: 'حكومي',
};

const base = (uid: string, email: string, name: string, role: Role): UserProfile => ({
  uid,
  email,
  name,
  role,
  ...DEMO_LOCATION,
  schoolApprovalStatus: 'approved',
  schoolStatus: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  needsOnboarding: false,
});

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { ...base('demo-principal', 'principal.demo@edusmart.local', 'أحمد مدير المدرسة', 'principal'), password: 'demo123', label: 'مدير المدرسة' },
  { ...base('demo-teacher', 'teacher.demo@edusmart.local', 'سمية المعلمة', 'teacher'), password: 'demo123', label: 'المعلمة' },
  { ...base('demo-student', 'student.demo@edusmart.local', 'محمد الطالب', 'student'), password: 'demo123', label: 'الطالب', grade: 'الصف السابع', gradeKey: 'grade_7', studentRegistrationKey: 'YEM-TEST-001' },
  { ...base('demo-parent', 'parent.demo@edusmart.local', 'أم محمد', 'parent'), password: 'demo123', label: 'ولي الأمر' },
];

export function getDemoAccount(email: string, password: string): DemoAccount | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalizedEmail && account.password === password);
}

export function createPreviewStudent(name: string, email: string, phoneNumber: string): UserProfile {
  return {
    ...base(`preview-student-${Date.now()}`, email, name, 'student'),
    phoneNumber,
    school: '',
    schoolId: '',
    schoolStatus: 'pending',
    schoolApprovalStatus: 'pending',
    needsOnboarding: false,
    grade: 'غير محدد بعد',
    gradeKey: '',
    studentRegistrationKey: '',
  };
}
