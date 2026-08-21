import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { CurriculumBook, CurriculumLesson, CurriculumUnit } from '../types/curriculum';
import { getGradeKey, getGradeLabelAr } from './gradeCatalog';

export const CURRICULUM_COLLECTION = 'curriculumBooks';

export interface CurriculumPage {
  pageNumber: number;
  text: string;
}

export interface CurriculumViewerContext {
  uid?: string;
  schoolId?: string;
  school?: string;
  grade?: string;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLesson(raw: any, index: number): CurriculumLesson {
  return {
    id: String(raw?.id || `lesson-${index + 1}`),
    title: String(raw?.title || raw?.name || `الدرس ${index + 1}`),
    lessonNumber: asNumber(raw?.lessonNumber, index + 1),
    startPage: asNumber(raw?.startPage, 1),
    endPage: asNumber(raw?.endPage, asNumber(raw?.startPage, 1)),
    description: raw?.description ? String(raw.description) : undefined,
    sampleContent: raw?.sampleContent ? String(raw.sampleContent) : undefined,
  };
}

function normalizeUnit(raw: any, index: number): CurriculumUnit {
  const lessons = Array.isArray(raw?.lessons) ? raw.lessons : [];
  return {
    id: String(raw?.id || `unit-${index + 1}`),
    title: String(raw?.title || raw?.name || `الوحدة ${index + 1}`),
    unitNumber: asNumber(raw?.unitNumber, index + 1),
    startPage: asNumber(raw?.startPage, 1),
    endPage: asNumber(raw?.endPage, asNumber(raw?.startPage, 1)),
    description: raw?.description ? String(raw.description) : undefined,
    lessons: lessons.map(normalizeLesson),
  };
}

export function normalizeCurriculumBook(id: string, data: DocumentData): CurriculumBook {
  const gradeKey = getGradeKey(data.gradeKey || data.grade);
  const units = Array.isArray(data.units) ? data.units.map(normalizeUnit) : [];
  const totalPageCount = asNumber(data.totalPageCount || data.pageCount, 1);

  return {
    id,
    title: String(data.title || data.name || 'كتاب منهجي'),
    grade: String(data.grade || getGradeLabelAr(gradeKey) || ''),
    gradeKey,
    subject: String(data.subject || 'مادة دراسية'),
    totalPageCount,
    pdfUrl: data.pdfUrl ? String(data.pdfUrl) : undefined,
    manifestUrl: data.manifestUrl ? String(data.manifestUrl) : undefined,
    textIndexUrl: data.textIndexUrl ? String(data.textIndexUrl) : undefined,
    storagePath: data.storagePath ? String(data.storagePath) : undefined,
    manifestStoragePath: data.manifestStoragePath ? String(data.manifestStoragePath) : undefined,
    schoolId: data.schoolId ? String(data.schoolId) : undefined,
    schoolName: data.schoolName ? String(data.schoolName) : undefined,
    semester: data.semester ? String(data.semester) : undefined,
    part: data.part ? String(data.part) : undefined,
    source: data.source ? String(data.source) : undefined,
    publisher: data.publisher ? String(data.publisher) : undefined,
    isOfficial: Boolean(data.isOfficial),
    isActive: data.isActive !== false,
    contentVersion: data.contentVersion ? String(data.contentVersion) : undefined,
    academicYear: data.academicYear ? String(data.academicYear) : undefined,
    coverColor: data.coverColor ? String(data.coverColor) : undefined,
    isCustomized: Boolean(data.isCustomized),
    units,
  };
}

function isVisibleToUser(book: CurriculumBook, context: CurriculumViewerContext): boolean {
  if (book.isActive === false) return false;
  if (!book.schoolId) return true;
  return Boolean(context.schoolId && book.schoolId === context.schoolId);
}

function sortBooks(books: CurriculumBook[]): CurriculumBook[] {
  return books.sort((a, b) => {
    const subjectOrder = a.subject.localeCompare(b.subject, 'ar');
    if (subjectOrder !== 0) return subjectOrder;
    return String(a.part || '').localeCompare(String(b.part || ''), 'ar');
  });
}

export function subscribeToCurriculumBooks(
  grade: string | undefined,
  context: CurriculumViewerContext,
  onChange: (books: CurriculumBook[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const gradeKey = getGradeKey(grade);
  const constraints = gradeKey
    ? [where('gradeKey', '==', gradeKey)]
    : [];
  const booksQuery = query(collection(db, CURRICULUM_COLLECTION), ...constraints);

  return onSnapshot(
    booksQuery,
    (snapshot) => {
      const books = snapshot.docs
        .map((bookDoc) => normalizeCurriculumBook(bookDoc.id, bookDoc.data()))
        .filter((book) => isVisibleToUser(book, context));
      onChange(sortBooks(books));
    },
    (error) => onError?.(error as Error),
  );
}

export async function getCurriculumBooks(
  grade: string | undefined,
  context: CurriculumViewerContext,
): Promise<CurriculumBook[]> {
  const gradeKey = getGradeKey(grade);
  const constraints = gradeKey ? [where('gradeKey', '==', gradeKey)] : [];
  const snapshot = await getDocs(query(collection(db, CURRICULUM_COLLECTION), ...constraints));
  return sortBooks(
    snapshot.docs
      .map((bookDoc) => normalizeCurriculumBook(bookDoc.id, bookDoc.data()))
      .filter((book) => isVisibleToUser(book, context)),
  );
}

const pageCache = new Map<string, Promise<CurriculumPage[]>>();

function normalizePages(payload: any): CurriculumPage[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.pages)
      ? payload.pages
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return rows
    .map((row: any, index: number) => ({
      pageNumber: asNumber(row?.pageNumber ?? row?.page ?? row?.number, index + 1),
      text: String(row?.text ?? row?.content ?? '').trim(),
    }))
    .filter((page: CurriculumPage) => page.text.length > 0);
}

export async function loadBookPages(book: CurriculumBook): Promise<CurriculumPage[]> {
  const sourceUrl = book.manifestUrl || book.textIndexUrl;
  if (!sourceUrl) return [];
  const cached = pageCache.get(sourceUrl);
  if (cached) return cached;

  const request = fetch(sourceUrl, { credentials: 'omit' }).then(async (response) => {
    if (!response.ok) throw new Error(`تعذر تحميل النص المفهرس (${response.status})`);
    return normalizePages(await response.json());
  });
  pageCache.set(sourceUrl, request);
  return request;
}

export async function loadBookPage(book: CurriculumBook, pageNumber: number): Promise<string> {
  const pages = await loadBookPages(book);
  return pages.find((page) => page.pageNumber === pageNumber)?.text || '';
}

export function clearCurriculumPageCache(): void {
  pageCache.clear();
}
