import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserProfile } from './store';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AssessmentType = 'quiz' | 'monthly' | 'midterm' | 'final' | 'annual' | 'assignment';

export interface SchoolStudent {
  uid: string;
  name: string;
  email?: string;
  schoolId: string;
  gradeKey?: string;
  classId?: string;
  studentIdentifier?: string;
  parentId?: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  gradeKey?: string;
  classId?: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface TeacherAttendanceRecord {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface GradeRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  gradeKey?: string;
  classId?: string;
  subjectKey: string;
  subjectLabel: string;
  assessmentType: AssessmentType;
  assessmentTitle: string;
  score: number;
  maxScore: number;
  visibleToStudent: boolean;
  recordedBy: string;
  recordedAt: string;
  updatedAt: string;
}

function actorId(): string {
  if (!auth.currentUser?.uid) throw new Error('AUTH_REQUIRED');
  return auth.currentUser.uid;
}

function mapDocs<T>(snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }): T[] {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
}

export async function listSchoolStudents(schoolId: string): Promise<SchoolStudent[]> {
  if (!schoolId) return [];
  const snapshot = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student')));
  return mapDocs<SchoolStudent>(snapshot).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listSchoolTeachers(schoolId: string): Promise<SchoolStudent[]> {
  if (!schoolId) return [];
  const snapshot = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'teacher')));
  return mapDocs<SchoolStudent>(snapshot).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listAttendanceForDate(schoolId: string, date: string): Promise<AttendanceRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'attendanceRecords'), where('schoolId', '==', schoolId), where('date', '==', date)));
  return mapDocs<AttendanceRecord>(snapshot);
}

export async function saveAttendance(record: Omit<AttendanceRecord, 'id' | 'recordedBy' | 'recordedAt'>): Promise<void> {
  const uid = actorId();
  const now = new Date().toISOString();
  const id = `${record.schoolId}_${record.date}_${record.studentId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  await setDoc(doc(db, 'attendanceRecords', id), { ...record, recordedBy: uid, recordedAt: now, updatedAt: now, visibleToStudent: true }, { merge: true });
}

export async function listTeacherAttendanceForDate(schoolId: string, date: string): Promise<TeacherAttendanceRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'teacherAttendance'), where('schoolId', '==', schoolId), where('date', '==', date)));
  return mapDocs<TeacherAttendanceRecord>(snapshot);
}

export async function saveTeacherAttendance(record: Omit<TeacherAttendanceRecord, 'id' | 'recordedBy' | 'recordedAt'>): Promise<void> {
  const uid = actorId();
  const now = new Date().toISOString();
  const id = `${record.schoolId}_${record.date}_${record.teacherId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  await setDoc(doc(db, 'teacherAttendance', id), { ...record, recordedBy: uid, recordedAt: now, updatedAt: now }, { merge: true });
}

export async function listGrades(schoolId: string): Promise<GradeRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'gradeRecords'), where('schoolId', '==', schoolId)));
  return mapDocs<GradeRecord>(snapshot).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveGrade(record: Omit<GradeRecord, 'id' | 'recordedBy' | 'recordedAt' | 'updatedAt'>): Promise<void> {
  const uid = actorId();
  const now = new Date().toISOString();
  const id = `${record.schoolId}_${record.studentId}_${record.subjectKey}_${record.assessmentType}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const gradeRef = doc(db, 'gradeRecords', id);
  await setDoc(gradeRef, { ...record, recordedBy: uid, recordedAt: now, updatedAt: now }, { merge: true });
}

export async function writeAcademicAudit(action: 'create' | 'update', collectionName: string, entityId: string, after: Record<string, unknown>): Promise<void> {
  const uid = actorId();
  await addDoc(collection(db, 'auditLogs'), { action, collection: collectionName, entityId, before: null, after, actorId: uid, createdAt: new Date().toISOString() });
}

export function profileSchoolId(user: UserProfile | null): string {
  return user?.schoolId || '';
}
