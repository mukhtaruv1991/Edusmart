import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { CurriculumBook, CurriculumPage } from '../types/curriculum';
import { getGradeLabelAr, YemenGradeKey } from './gradeCatalog';

export interface PublishCurriculumInput {
  title: string;
  subject: string;
  gradeKey: YemenGradeKey;
  part: 'part_1' | 'part_2' | 'combined';
  pdfFile: File;
  manifestFile: File;
  schoolId?: string;
  schoolName?: string;
  createdBy: string;
  onProgress?: (percent: number) => void;
}

function buildUnits(totalPageCount: number) {
  const pagesPerLesson = 12;
  const lessons = Array.from({ length: Math.ceil(totalPageCount / pagesPerLesson) }, (_, index) => {
    const startPage = index * pagesPerLesson + 1;
    const endPage = Math.min(totalPageCount, startPage + pagesPerLesson - 1);
    return {
      id: `lesson-pages-${startPage}-${endPage}`,
      title: `صفحات ${startPage} - ${endPage}`,
      lessonNumber: index + 1,
      startPage,
      endPage,
    };
  });

  return [{
    id: 'unit-book-pages',
    title: 'فهرس الصفحات',
    unitNumber: 1,
    startPage: 1,
    endPage: totalPageCount,
    lessons,
  }];
}

async function parseManifest(file: File): Promise<CurriculumPage[]> {
  const payload = JSON.parse(await file.text());
  const rows = Array.isArray(payload) ? payload : payload.pages || payload.data || [];
  return rows
    .map((row: any, index: number) => ({
      pageNumber: Number(row.pageNumber ?? row.page ?? row.number ?? index + 1),
      text: String(row.text ?? row.content ?? '').trim(),
    }))
    .filter((page: CurriculumPage) => page.text.length > 0);
}

export async function publishCurriculumBook(input: PublishCurriculumInput): Promise<CurriculumBook> {
  if (!input.pdfFile || !input.manifestFile) throw new Error('يجب اختيار PDF وملف JSON المعالج معاً');
  const pages = await parseManifest(input.manifestFile);
  if (pages.length === 0) throw new Error('ملف JSON لا يحتوي صفحات نصية قابلة للفهرسة');

  const bookRef = doc(collection(db, 'curriculumBooks'));
  const root = `curriculum/${input.gradeKey}/${bookRef.id}`;
  const pdfStorageRef = ref(storage, `${root}/book.pdf`);
  const manifestStorageRef = ref(storage, `${root}/pages.json`);

  await uploadBytes(pdfStorageRef, input.pdfFile, { contentType: 'application/pdf' });
  input.onProgress?.(60);
  await uploadBytes(manifestStorageRef, input.manifestFile, { contentType: 'application/json' });
  input.onProgress?.(85);

  const [pdfUrl, manifestUrl] = await Promise.all([
    getDownloadURL(pdfStorageRef),
    getDownloadURL(manifestStorageRef),
  ]);

  const book: CurriculumBook = {
    id: bookRef.id,
    title: input.title.trim(),
    grade: getGradeLabelAr(input.gradeKey),
    gradeKey: input.gradeKey,
    subject: input.subject.trim(),
    totalPageCount: Math.max(...pages.map((page) => page.pageNumber)),
    pdfUrl,
    manifestUrl,
    textIndexUrl: manifestUrl,
    storagePath: `${root}/book.pdf`,
    manifestStoragePath: `${root}/pages.json`,
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    part: input.part,
    source: input.schoolId ? 'school' : 'official',
    publisher: 'EduSmart',
    isOfficial: !input.schoolId,
    isActive: true,
    contentVersion: new Date().toISOString(),
    units: buildUnits(Math.max(...pages.map((page) => page.pageNumber))),
  };

  await setDoc(bookRef, {
    ...book,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  });
  input.onProgress?.(100);
  return book;
}

export async function listSchoolCurriculumBooks(schoolId?: string, schoolName?: string): Promise<CurriculumBook[]> {
  if (!schoolId && !schoolName) return [];
  const field = schoolId ? 'schoolId' : 'schoolName';
  const value = schoolId || schoolName;
  const snapshot = await getDocs(query(collection(db, 'curriculumBooks'), where(field, '==', value)));
  return snapshot.docs.map((bookDoc) => ({ id: bookDoc.id, ...bookDoc.data() } as CurriculumBook));
}

export async function deleteCurriculumBook(bookId: string): Promise<void> {
  await deleteDoc(doc(db, 'curriculumBooks', bookId));
}
