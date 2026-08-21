import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useStore, UserProfile } from './lib/store';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
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
import SchoolManagement from './components/dashboard/SchoolManagement';
import UsersManagement from './pages/dashboard/admin/UsersManagement';
import TeacherClasses from './pages/dashboard/teacher/TeacherClasses';
import TeacherExams from './pages/dashboard/teacher/TeacherExams';
import CompetitionsView from './components/dashboard/CompetitionsView';
import CalendarView from './components/dashboard/CalendarView';
import AlertsView from './components/dashboard/AlertsView';
import Settings from './pages/dashboard/Settings';
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
        // Check email verification for password providers
        const isPasswordProvider = firebaseUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider && !firebaseUser.emailVerified) {
          await signOut(auth);
          setUser(null);
          setAuthReady(true);
          return;
        }

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
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<RoleBasedRedirect />} />
          
          {/* Principal Routes */}
          <Route path="principal" element={<PrincipalDashboard />} />
          <Route path="principal/add-teachers" element={<Navigate to="/principal/teachers" replace />} />
          <Route path="principal/add-curriculums" element={<CurriculumsManagement />} />
          <Route path="principal/competitions" element={<CompetitionsManagement />} />
          <Route path="principal/classes" element={<ClassesManagement />} />
          <Route path="principal/teachers" element={<TeachersList />} />
          <Route path="principal/calendar" element={<CalendarManagement />} />
          <Route path="principal/chats" element={<ChatInterface />} />
          <Route path="principal/alerts" element={<AlertsManagement />} />
          <Route path="principal/parents" element={<ParentsList />} />
          <Route path="principal/notifications" element={<Navigate to="/principal/alerts" replace />} />
          <Route path="principal/tracking" element={<TrackingManagement />} />
          <Route path="principal/settings" element={<Settings />} />
          <Route path="principal/financials" element={<FinancialsManagement />} />
          <Route path="principal/expenses" element={<Navigate to="/principal/financials" replace />} />

          {/* Teacher Routes */}
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="teacher/classes" element={<TeacherClasses />} />
          <Route path="teacher/students" element={<StudentsList />} />
          <Route path="teacher/competitions" element={<CompetitionsView />} />
          <Route path="teacher/exams" element={<TeacherExams />} />
          <Route path="teacher/alerts" element={<AlertsView />} />
          <Route path="teacher/notifications" element={<Navigate to="/teacher/alerts" replace />} />
          <Route path="teacher/calendar" element={<CalendarView />} />
          <Route path="teacher/chats" element={<ChatInterface />} />

          {/* Student Routes */}
          <Route path="student" element={<StudentDashboard />} />
          <Route path="student/curriculums" element={<StudentCurriculums />} />
          <Route path="student/private-exams" element={<StudentExams type="private" />} />
          <Route path="student/school-exams" element={<StudentExams type="school" />} />
          <Route path="student/competitions" element={<CompetitionsView />} />
          <Route path="student/competitions/:competitionId" element={<CompetitionPlay />} />
          <Route path="student/profile" element={<StudentProfile />} />
          <Route path="student/chats" element={<ChatInterface />} />

          {/* Parent Routes */}
          <Route path="parent" element={<ParentDashboard />} />
          <Route path="parent/children" element={<ParentChildren />} />
          <Route path="parent/chats" element={<ChatInterface />} />
          <Route path="parent/alerts" element={<AlertsView />} />
          <Route path="parent/notifications" element={<Navigate to="/parent/alerts" replace />} />
          <Route path="parent/tracking" element={<ParentTracking />} />

          {/* Admin Routes */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/schools" element={<SchoolManagement />} />
          <Route path="admin/users" element={<UsersManagement />} />
          <Route path="admin/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position={language === 'ar' ? 'top-left' : 'top-right'} dir={language === 'ar' ? 'rtl' : 'ltr'} richColors />
    </Router>
  );
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
