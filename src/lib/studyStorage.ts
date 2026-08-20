import { StudyAIItem, StudyQuiz, CurriculumUnit } from '../types/curriculum';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

const STORAGE_KEYS = {
  AI_ITEMS: 'edusmart_study_ai_items',
  STUDY_QUIZZES: 'edusmart_study_quizzes',
  CUSTOM_CURRICULA: 'edusmart_custom_curricula_indexes',
  STUDY_PROGRESS: 'edusmart_study_progress',
  HIGHLIGHTS: 'edusmart_study_highlights',
};

// -------------------------------------------------------------
// 1. AI Items (Explanations, Summaries, Quizzes, Translations)
// -------------------------------------------------------------

export function getLocalStudyItems(studentId: string, curriculumId?: string, unitId?: string, lessonId?: string): StudyAIItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_ITEMS);
    if (!raw) return [];
    const all: StudyAIItem[] = JSON.parse(raw);
    return all.filter(item => {
      if (item.studentId !== studentId) return false;
      if (curriculumId && item.curriculumId !== curriculumId) return false;
      if (unitId && item.unitId !== unitId) return false;
      if (lessonId && item.lessonId !== lessonId) return false;
      return true;
    });
  } catch (e) {
    console.error('Failed to get local study items:', e);
    return [];
  }
}

export async function saveStudyAIItem(item: StudyAIItem): Promise<StudyAIItem> {
  try {
    // 1. Save to Local Storage first (instant <10ms offline support)
    const raw = localStorage.getItem(STORAGE_KEYS.AI_ITEMS);
    const all: StudyAIItem[] = raw ? JSON.parse(raw) : [];
    
    // Check if exists or update
    const existingIndex = all.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      all[existingIndex] = item;
    } else {
      all.unshift(item);
    }
    localStorage.setItem(STORAGE_KEYS.AI_ITEMS, JSON.stringify(all));

    // 2. Sync to Firestore in background if online
    if (navigator.onLine && db) {
      try {
        const docRef = doc(db, 'study_notes_and_ai', item.id);
        await setDoc(docRef, item, { merge: true });
      } catch (err) {
        console.warn('Silent Firestore sync for study item:', err);
      }
    }

    return item;
  } catch (error) {
    console.error('Error saving study AI item:', error);
    return item;
  }
}

export async function deleteStudyAIItem(id: string, studentId: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_ITEMS);
    if (raw) {
      const all: StudyAIItem[] = JSON.parse(raw);
      const filtered = all.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.AI_ITEMS, JSON.stringify(filtered));
    }

    if (navigator.onLine && db) {
      try {
        await deleteDoc(doc(db, 'study_notes_and_ai', id));
      } catch (err) {
        console.warn('Silent delete study item from Firestore:', err);
      }
    }
    return true;
  } catch (e) {
    console.error('Error deleting study AI item:', e);
    return false;
  }
}

// -------------------------------------------------------------
// 2. Self-Study Quizzes & Exam Practice
// -------------------------------------------------------------

export function getLocalQuizzes(studentId: string, curriculumId?: string, lessonId?: string): StudyQuiz[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_QUIZZES);
    if (!raw) return [];
    const all: StudyQuiz[] = JSON.parse(raw);
    return all.filter(q => {
      if (q.studentId !== studentId) return false;
      if (curriculumId && q.curriculumId !== curriculumId) return false;
      if (lessonId && q.lessonId !== lessonId) return false;
      return true;
    });
  } catch (e) {
    console.error('Failed to get local quizzes:', e);
    return [];
  }
}

export async function saveStudyQuiz(quiz: StudyQuiz): Promise<StudyQuiz> {
  try {
    // 1. Save locally
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_QUIZZES);
    const all: StudyQuiz[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(q => q.id === quiz.id);
    if (idx >= 0) {
      all[idx] = quiz;
    } else {
      all.unshift(quiz);
    }
    localStorage.setItem(STORAGE_KEYS.STUDY_QUIZZES, JSON.stringify(all));

    // 2. Background Firestore Sync
    if (navigator.onLine && db) {
      try {
        const docRef = doc(db, 'student_quizzes', quiz.id);
        await setDoc(docRef, quiz, { merge: true });
      } catch (err) {
        console.warn('Silent sync for quiz:', err);
      }
    }

    return quiz;
  } catch (e) {
    console.error('Error saving study quiz:', e);
    return quiz;
  }
}

// -------------------------------------------------------------
// 3. Custom Curriculum Indexing (Units & Lessons Page Ranges)
// -------------------------------------------------------------

export function getCustomUnits(curriculumId: string): CurriculumUnit[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CURRICULA);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[curriculumId] || null;
  } catch (e) {
    console.error('Failed to get custom units:', e);
    return null;
  }
}

export function saveCustomUnits(curriculumId: string, units: CurriculumUnit[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CURRICULA);
    const map = raw ? JSON.parse(raw) : {};
    map[curriculumId] = units;
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CURRICULA, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save custom units:', e);
  }
}

// -------------------------------------------------------------
// 4. Study Progress Tracking (Last Read Page)
// -------------------------------------------------------------

export interface LastReadProgress {
  curriculumId: string;
  unitId?: string;
  lessonId?: string;
  pageNumber: number;
  lastReadAt: string;
}

export function saveLastReadProgress(progress: LastReadProgress): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_PROGRESS);
    const map = raw ? JSON.parse(raw) : {};
    map[progress.curriculumId] = progress;
    localStorage.setItem(STORAGE_KEYS.STUDY_PROGRESS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function getLastReadProgress(curriculumId: string): LastReadProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_PROGRESS);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[curriculumId] || null;
  } catch (e) {
    return null;
  }
}
