import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'principal' | 'teacher' | 'student' | 'parent' | 'admin';

export interface UserProfile {
  uid: string;
  role: Role;
  name: string;
  email: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  gender?: string;
  province?: string;
  school?: string;
  schoolId?: string;
  schoolSystem?: string;
  schoolApprovalStatus?: 'pending' | 'approved' | 'rejected';
  schoolStatus?: 'pending' | 'active' | 'rejected' | 'none';
  nameKey?: string;
  studentRegistrationKey?: string;
  governorateId?: string;
  governorate?: string;
  districtId?: string;
  district?: string;
  specialization?: string;
  grade?: string;
  gradeKey?: string;
  academicYear?: string;
  createdAt: string;
  needsOnboarding?: boolean;
}

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  isAuthReady: boolean;
  setAuthReady: (ready: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      language: 'ar',
      setLanguage: (language) => {
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
        set({ language });
      },
      isAuthReady: false,
      setAuthReady: (isAuthReady) => set({ isAuthReady }),
    }),
    {
      name: 'edusmart-storage',
      partialize: (state) => ({ language: state.language, user: state.user }),
    }
  )
);
