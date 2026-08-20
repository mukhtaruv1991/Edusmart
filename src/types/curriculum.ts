export interface CurriculumLesson {
  id: string;
  title: string;
  lessonNumber: number;
  startPage: number;
  endPage: number;
  description?: string;
  sampleContent?: string;
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

export interface CurriculumBook {
  id: string;
  title: string;
  grade: string;
  subject: string;
  totalPageCount: number;
  pdfUrl?: string;
  schoolId?: string;
  schoolName?: string;
  semester?: string;
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
