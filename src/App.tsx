import React, { ReactNode, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useStore, UserProfile, Role } from './lib/store';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import EmailLinkHandler from './pages/auth/EmailLinkHandler';
import Onboarding from './pages/auth/Onboarding';
import DashboardLayout from './components/layout/DashboardLayout';
import PrincipalDashboard from './pages/dashboard/PrincipalDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import StudentCurriculums from './pages/dashboard/student/StudentCurriculums';
import StudentProfile from './pages/dashboard/student/StudentProfile';
import StudentExams from './pages/dashboard/student/StudentExams';
import CompetitionPlay from './pages/dashboard/student/CompetitionPlay';
import ChatInterface from './components/chat/ChatInterface';
import TeachersList from './pages/dashboard/principal/TeachersList';
import ClassesManagement from './pages/dashboard/principal/ClassesManagement';
import CurriculumsManagement from './pages/dashboard/principal/CurriculumsManagement';
import CompetitionsManagement from './pages/dashboard/principal/CompetitionsManagement';
import CalendarManagement from './pages/dashboard/principal/CalendarManagement';
import AlertsManagement from './pages/dashboard/principal/AlertsManagement';
import TrackingManagement from './pages/dashboard/principal/TrackingManagement';
import FinancialsManagement from './pages/dashboard/principal/FinancialsManagement';
import ParentsList from './pages/dashboard/principal/ParentsList';
import StudentsList from './pages/dashboard/teacher/StudentsList';
import ParentDashboard from './pages/dashboard/ParentDashboard';
import ParentChildren from './pages/dashboard/parent/ParentChildren';
import ParentTracking from './pages/dashboard/parent/ParentTracking';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AdminControlCenter from './pages/dashboard/AdminControlCenter';
import SchoolManagement from './components/dashboard/SchoolManagement';
import UsersManagement from './pages/dashboard/admin/UsersManagement';
import TeacherClasses from './pages/dashboard/teacher/TeacherClasses';
import TeacherExams from './pages/dashboard/teacher/TeacherExams';
import CompetitionsView from './components/dashboard/CompetitionsView';
import CalendarView from './components/dashboard/CalendarView';
import AlertsView from './components/dashboard/AlertsView';
import Settings from './pages/dashboard/Settings';
import PwaInstallPrompt from './components/pwa/PwaInstallPrompt';
import { Toaster, toast } from 'sonner';
import { 
  BookOpen, Users, FileText, Settings as SettingsIcon, MessageSquare, Trophy, 
  User, Calendar, Bell, MapPin, DollarSign, CreditCard, 
  GraduationCap, UsersRound, Building2
} from 'lucide-react';

export default function App() {
  const { setUser, setAuthReady, language, setLanguage } = useStore();

  useEffect(() => {
    // Initialize language direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        // Email verification is encouraged but does not block onboarding.
        // This keeps registration usable in low-bandwidth environments where
        // verification messages may arrive late or not at all.

        // Set initial fallback user state so UI is never blocked
        setUser({ 
          uid: firebaseUser.uid, 
          email: firebaseUser.email || '', 
          name: firebaseUser.displayName || '', 
          needsOnboarding: true 
        } as any);

        // Real-time listener on the user's Firestore document
        unsubscribeDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (!data.role) {
                setUser({ ...data, uid: firebaseUser.uid, needsOnboarding: true } as any);
              } else {
                setUser(data as UserProfile);
              }
            } else {
              setUser({ 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '', 
                name: firebaseUser.displayName || '', 
                needsOnboarding: true 
              } as any);
            }
            setAuthReady(true);
          },
          (error) => {
            console.warn('User profile onSnapshot event:', error);
            // Even if offline, keep auth state ready
            setAuthReady(true);
          }
        );
      } else {
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, [setUser, setAuthReady]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/email-link" element={<EmailLinkHandler />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<RoleBasedRedirect />} />
          
          {/* Principal Routes */}
          <Route path="principal" element={<RoleGuard roles={['principal']}><PrincipalDashboard /></RoleGuard>} />
          <Route path="principal/add-teachers" element={<RoleGuard roles={['principal']}><Navigate to="/principal/teachers" replace /></RoleGuard>} />
          <Route path="principal/add-curriculums" element={<RoleGuard roles={['principal']}><CurriculumsManagement /></RoleGuard>} />
          <Route path="principal/competitions" element={<RoleGuard roles={['principal']}><CompetitionsManagement /></RoleGuard>} />
          <Route path="principal/classes" element={<RoleGuard roles={['principal']}><ClassesManagement /></RoleGuard>} />
          <Route path="principal/teachers" element={<RoleGuard roles={['principal']}><TeachersList /></RoleGuard>} />
          <Route path="principal/calendar" element={<RoleGuard roles={['principal']}><CalendarManagement /></RoleGuard>} />
          <Route path="principal/chats" element={<RoleGuard roles={['principal']}><ChatInterface /></RoleGuard>} />
          <Route path="principal/alerts" element={<RoleGuard roles={['principal']}><AlertsManagement /></RoleGuard>} />
          <Route path="principal/parents" element={<RoleGuard roles={['principal']}><ParentsList /></RoleGuard>} />
          <Route path="principal/notifications" element={<RoleGuard roles={['principal']}><Navigate to="/principal/alerts" replace /></RoleGuard>} />
          <Route path="principal/tracking" element={<RoleGuard roles={['principal']}><TrackingManagement /></RoleGuard>} />
          <Route path="principal/settings" element={<RoleGuard roles={['principal']}><Settings /></RoleGuard>} />
          <Route path="principal/financials" element={<RoleGuard roles={['principal']}><FinancialsManagement /></RoleGuard>} />
          <Route path="principal/expenses" element={<RoleGuard roles={['principal']}><Navigate to="/principal/financials" replace /></RoleGuard>} />

          {/* Teacher Routes */}
          <Route path="teacher" element={<RoleGuard roles={['teacher']}><TeacherDashboard /></RoleGuard>} />
          <Route path="teacher/classes" element={<RoleGuard roles={['teacher']}><TeacherClasses /></RoleGuard>} />
          <Route path="teacher/students" element={<RoleGuard roles={['teacher']}><StudentsList /></RoleGuard>} />
          <Route path="teacher/competitions" element={<RoleGuard roles={['teacher']}><CompetitionsView /></RoleGuard>} />
          <Route path="teacher/exams" element={<RoleGuard roles={['teacher']}><TeacherExams /></RoleGuard>} />
          <Route path="teacher/alerts" element={<RoleGuard roles={['teacher']}><AlertsView /></RoleGuard>} />
          <Route path="teacher/notifications" element={<RoleGuard roles={['teacher']}><Navigate to="/teacher/alerts" replace /></RoleGuard>} />
          <Route path="teacher/calendar" element={<RoleGuard roles={['teacher']}><CalendarView /></RoleGuard>} />
          <Route path="teacher/chats" element={<RoleGuard roles={['teacher']}><ChatInterface /></RoleGuard>} />

          {/* Student Routes */}
          <Route path="student" element={<RoleGuard roles={['student']}><StudentDashboard /></RoleGuard>} />
          <Route path="student/curriculums" element={<RoleGuard roles={['student']}><StudentCurriculums /></RoleGuard>} />
          <Route path="student/private-exams" element={<RoleGuard roles={['student']}><StudentExams type="private" /></RoleGuard>} />
          <Route path="student/school-exams" element={<RoleGuard roles={['student']}><StudentExams type="school" /></RoleGuard>} />
          <Route path="student/competitions" element={<RoleGuard roles={['student']}><CompetitionsView /></RoleGuard>} />
          <Route path="student/competitions/:competitionId" element={<RoleGuard roles={['student']}><CompetitionPlay /></RoleGuard>} />
          <Route path="student/profile" element={<RoleGuard roles={['student']}><StudentProfile /></RoleGuard>} />
          <Route path="student/chats" element={<RoleGuard roles={['student']}><ChatInterface /></RoleGuard>} />

          {/* Parent Routes */}
          <Route path="parent" element={<RoleGuard roles={['parent']}><ParentDashboard /></RoleGuard>} />
          <Route path="parent/children" element={<RoleGuard roles={['parent']}><ParentChildren /></RoleGuard>} />
          <Route path="parent/chats" element={<RoleGuard roles={['parent']}><ChatInterface /></RoleGuard>} />
          <Route path="parent/alerts" element={<RoleGuard roles={['parent']}><AlertsView /></RoleGuard>} />
          <Route path="parent/notifications" element={<RoleGuard roles={['parent']}><Navigate to="/parent/alerts" replace /></RoleGuard>} />
          <Route path="parent/tracking" element={<RoleGuard roles={['parent']}><ParentTracking /></RoleGuard>} />

          {/* Admin Routes */}
          <Route path="admin" element={<RoleGuard roles={['admin']}><AdminDashboard /></RoleGuard>} />
          <Route path="admin/control-center" element={<RoleGuard roles={['admin']}><AdminControlCenter /></RoleGuard>} />
          <Route path="admin/schools" element={<RoleGuard roles={['admin']}><SchoolManagement /></RoleGuard>} />
          <Route path="admin/users" element={<RoleGuard roles={['admin']}><UsersManagement /></RoleGuard>} />
          <Route path="admin/settings" element={<RoleGuard roles={['admin']}><Settings /></RoleGuard>} />
        </Route>
      </Routes>
      <Toaster position={language === 'ar' ? 'top-left' : 'top-right'} dir={language === 'ar' ? 'rtl' : 'ltr'} richColors />
      <PwaInstallPrompt />
    </Router>
  );
}

function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isAuthReady } = useStore();
  if (!isAuthReady) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { user, isAuthReady } = useStore();

  if (!isAuthReady) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsOnboarding) return <Navigate to="/onboarding" replace />;

  switch (user.role) {
    case 'principal': return <Navigate to="/principal" replace />;
    case 'teacher': return <Navigate to="/teacher" replace />;
    case 'student': return <Navigate to="/student" replace />;
    case 'parent': return <Navigate to="/parent" replace />;
    case 'admin': return <Navigate to="/admin" replace />;
    default: return <Navigate to="/onboarding" replace />;
  }
}
