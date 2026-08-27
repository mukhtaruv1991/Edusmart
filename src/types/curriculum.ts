export type CurriculumContentStatus = 'included' | 'excluded' | 'required';

export interface CurriculumContentOverride {
  id: string;
  schoolId: string;
  gradeKey: string;
  subjectKey: string;
  lessonKey: string;
  lessonTitle?: string;
  status: CurriculumContentStatus;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  lessonNumber: number;
  startPage: number;
  endPage: number;
  description?: string;
  sampleContent?: string;
  contentStatus?: CurriculumContentStatus;
  contentOverrideId?: string;
  contentOverrideNote?: string;
}

export interface CurriculumUnit {
  id: string;
  title: string;
  unitNumber: number;
  startPage: number;
  endPage: number;
  description?: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumPage {
  pageNumber: number;
  text: string;
}

export interface CurriculumBook {
  id: string;
  title: string;
  grade: string;
  gradeKey?: string;
  subject: string;
  subjectKey?: string;
  totalPageCount: number;
  pdfUrl?: string;
  sourceUrl?: string;
  manifestUrl?: string;
  contentMode?: 'manifest' | 'firestore_chunks' | string;
  contentChunkCount?: number;
  textIndexUrl?: string;
  storagePath?: string;
  manifestStoragePath?: string;
  schoolId?: string;
  schoolName?: string;
  semester?: string;
  part?: 'part_1' | 'part_2' | 'combined' | string;
  source?: 'official' | 'school' | 'teacher' | string;
  publisher?: string;
  isOfficial?: boolean;
  isActive?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'superseded' | string;
  approvedBy?: string;
  approvedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  replacedBy?: string;
  contentVersion?: string;
  units: CurriculumUnit[];
  coverColor?: string;
  academicYear?: string;
  isCustomized?: boolean;
}

export interface StudyAIItem {
  id: string;
  studentId: string;
  curriculumId: string;
  subject: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  pageNumber?: number;
  type: 'explain' | 'summary' | 'quiz' | 'translate' | 'custom_question';
  selectedText: string;
  aiResponse: string;
  createdAt: string;
  isBookmarked?: boolean;
}

export interface StudyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  studentAnswer?: number;
}

export interface StudyQuiz {
  id: string;
  studentId: string;
  curriculumId: string;
  subject: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  title: string;
  questions: StudyQuizQuestion[];
  score?: number;
  totalQuestions: number;
  createdAt: string;
  isCompleted?: boolean;
  isTeacherExam?: boolean;
}
