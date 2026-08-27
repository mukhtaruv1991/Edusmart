import {
  collection,
  doc,
  getDocs,
  orderBy,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { CurriculumBook, CurriculumContentOverride, CurriculumLesson, CurriculumUnit } from '../types/curriculum';
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
    subjectKey: data.subjectKey ? String(data.subjectKey) : undefined,
    totalPageCount,
    pdfUrl: data.pdfUrl ? String(data.pdfUrl) : undefined,
    sourceUrl: data.sourceUrl ? String(data.sourceUrl) : (data.pdfUrl ? String(data.pdfUrl) : undefined),
    manifestUrl: data.manifestUrl ? String(data.manifestUrl) : undefined,
    contentMode: data.contentMode ? String(data.contentMode) : undefined,
    contentChunkCount: data.contentChunkCount ? asNumber(data.contentChunkCount, 0) : undefined,
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
    approvalStatus: data.approvalStatus ? String(data.approvalStatus) : undefined,
    approvedBy: data.approvedBy ? String(data.approvedBy) : undefined,
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
    reviewedAt: data.reviewedAt ? String(data.reviewedAt) : undefined,
    replacedBy: data.replacedBy ? String(data.replacedBy) : undefined,
    contentVersion: data.contentVersion ? String(data.contentVersion) : undefined,
    academicYear: data.academicYear ? String(data.academicYear) : undefined,
    coverColor: data.coverColor ? String(data.coverColor) : undefined,
    isCustomized: Boolean(data.isCustomized),
    units,
  };
}

function isVisibleToUser(book: CurriculumBook, context: CurriculumViewerContext): boolean {
  if (book.isActive === false) return false;
  if (book.approvalStatus && book.approvalStatus !== 'approved') return false;
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

function normalizeContentOverride(id: string, data: DocumentData): CurriculumContentOverride | null {
  const status = String(data.status || 'included') as CurriculumContentOverride['status'];
  if (!['included', 'excluded', 'required'].includes(status)) return null;
  if (!data.schoolId || !data.gradeKey || !data.subjectKey || !data.lessonKey) return null;
  return {
    id,
    schoolId: String(data.schoolId),
    gradeKey: String(data.gradeKey),
    subjectKey: String(data.subjectKey),
    lessonKey: String(data.lessonKey),
    lessonTitle: data.lessonTitle ? String(data.lessonTitle) : undefined,
    status,
    decidedBy: data.decidedBy ? String(data.decidedBy) : undefined,
    decidedAt: data.decidedAt ? String(data.decidedAt) : undefined,
    note: data.note ? String(data.note) : undefined,
  };
}

/**
 * Reads school curriculum decisions without broadening the curriculum-book
 * query. Students can only see overrides belonging to their own school under
 * the Firestore sameSchool rule.
 */
export function subscribeToContentOverrides(
  book: Pick<CurriculumBook, 'gradeKey' | 'subject' | 'subjectKey'>,
  context: CurriculumViewerContext,
  onChange: (overrides: CurriculumContentOverride[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!context.schoolId || !book.gradeKey) {
    onChange([]);
    return () => undefined;
  }

  const overridesQuery = query(
    collection(db, 'contentOverrides'),
    where('schoolId', '==', context.schoolId),
  );

  return onSnapshot(
    overridesQuery,
    (snapshot) => {
        const subjectKeys = new Set([book.subjectKey, book.subject].filter(Boolean));
      const overrides = snapshot.docs
        .map((overrideDoc) => normalizeContentOverride(overrideDoc.id, overrideDoc.data()))
        .filter((override): override is CurriculumContentOverride => Boolean(override))
        .filter((override) => override.gradeKey === book.gradeKey && subjectKeys.has(override.subjectKey));
      onChange(overrides);
    },
    (error) => onError?.(error as Error),
  );
}

const pageCache = new Map<string, Promise<CurriculumPage[]>>();
const CURRICULUM_CACHE_NAME = 'edusmart-curriculum-pages-v1';

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
  const firestoreSource = `${book.id}:firestore_chunks`;
  if (!sourceUrl && book.contentMode !== 'firestore_chunks') return [];
  const cacheKey = sourceUrl || firestoreSource;
  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    if (!sourceUrl && book.contentMode === 'firestore_chunks') {
      const chunksSnapshot = await getDocs(query(
        collection(doc(db, CURRICULUM_COLLECTION, book.id), 'contentChunks'),
        orderBy('chunkIndex', 'asc'),
      ));
      const pages = chunksSnapshot.docs.flatMap((chunkDoc) => normalizePages(chunkDoc.data()?.pages));
      if (!pages.length) throw new Error('لا يوجد محتوى صفحات محفوظ لهذا الكتاب');
      return pages.sort((a, b) => a.pageNumber - b.pageNumber);
    }

    const cache = typeof window !== 'undefined' && 'caches' in window
      ? await window.caches.open(CURRICULUM_CACHE_NAME)
      : null;
    const cachedResponse = cache ? await cache.match(sourceUrl) : undefined;

    if (cachedResponse) {
      return normalizePages(await cachedResponse.clone().json());
    }

    const response = await fetch(sourceUrl, { credentials: 'omit' });
    if (!response.ok) throw new Error(`تعذر تحميل النص المفهرس (${response.status})`);
    if (cache) {
      await cache.put(sourceUrl, response.clone());
    }
    return normalizePages(await response.json());
  })();
  pageCache.set(cacheKey, request);
  return request;
}

export async function loadBookPage(book: CurriculumBook, pageNumber: number): Promise<string> {
  const pages = await loadBookPages(book);
  return pages.find((page) => page.pageNumber === pageNumber)?.text || '';
}

/**
 * Warms the browser cache with the complete processed page manifest. The page
 * text remains lightweight JSON; the original PDF is never copied into local
 * storage by this action.
 */
export async function cacheBookOffline(book: CurriculumBook): Promise<boolean> {
  const sourceUrl = book.manifestUrl || book.textIndexUrl;
  if (book.contentMode === 'firestore_chunks' && !sourceUrl) {
    const pages = await loadBookPages(book);
    return pages.length > 0;
  }
  if (!sourceUrl || typeof window === 'undefined' || !('caches' in window)) return false;

  await loadBookPages(book);
  const cache = await window.caches.open(CURRICULUM_CACHE_NAME);
  const cachedResponse = await cache.match(sourceUrl);
  if (!cachedResponse) {
    await cache.add(sourceUrl);
  }
  return true;
}

export async function isBookCachedOffline(book: CurriculumBook): Promise<boolean> {
  const sourceUrl = book.manifestUrl || book.textIndexUrl;
  if (book.contentMode === 'firestore_chunks' && !sourceUrl) return pageCache.has(`${book.id}:firestore_chunks`);
  if (!sourceUrl || typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const cache = await window.caches.open(CURRICULUM_CACHE_NAME);
    return Boolean(await cache.match(sourceUrl));
  } catch {
    return false;
  }
}

export function clearCurriculumPageCache(): void {
  pageCache.clear();
}
