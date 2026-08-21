import { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { CurriculumBook, CurriculumContentOverride, CurriculumUnit, CurriculumLesson, StudyAIItem, StudyQuiz } from '../../../types/curriculum';
import { subscribeToContentOverrides, subscribeToCurriculumBooks } from '../../../lib/curriculumService';
import { YEMEN_GRADE_OPTIONS } from '../../../lib/gradeCatalog';
import { getLocalStudyItems, getLocalQuizzes, getCustomUnits } from '../../../lib/studyStorage';
import UnitsLessonsTree from '../../../components/curriculum/UnitsLessonsTree';
import InteractiveReader from '../../../components/curriculum/InteractiveReader';
import StudyNotesView from '../../../components/curriculum/StudyNotesView';
import StudyQuizzesView from '../../../components/curriculum/StudyQuizzesView';
import StudentExams from '../../../components/dashboard/StudentExams';
import {
  BookOpen, Search, Sparkles, Brain, FileText, ArrowRight,
  DownloadCloud, Layers, ArrowLeft
} from 'lucide-react';

function applyCurriculumOverrides(book: CurriculumBook, overrides: CurriculumContentOverride[]): CurriculumBook {
  const subjectKeys = new Set([book.subjectKey, book.subject].filter(Boolean));
  const bookOverrides = overrides.filter((override) => override.gradeKey === book.gradeKey && subjectKeys.has(override.subjectKey));
  if (bookOverrides.length === 0) return book;

  return {
    ...book,
    units: book.units.map((unit) => ({
      ...unit,
      lessons: unit.lessons.map((lesson) => {
        const override = bookOverrides.find((item) => item.lessonKey === lesson.id || item.lessonKey === lesson.title || item.lessonTitle === lesson.title);
        return override ? {
          ...lesson,
          contentStatus: override.status,
          contentOverrideId: override.id,
          contentOverrideNote: override.note,
        } : lesson;
      }),
    })),
  };
}

export default function StudentCurriculums() {
  const { user, language } = useStore();
  const [selectedGrade, setSelectedGrade] = useState<string>(user?.grade || YEMEN_GRADE_OPTIONS[0].labelAr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [remoteBooks, setRemoteBooks] = useState<CurriculumBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  
  // Selected Curriculum Detail View
  const [selectedBook, setSelectedBook] = useState<CurriculumBook | null>(null);
  const [contentOverrides, setContentOverrides] = useState<CurriculumContentOverride[]>([]);
  const [activeTab, setActiveTab] = useState<'units' | 'reader' | 'notes' | 'quizzes' | 'exams'>('units');
  
  // Active reader target
  const [readerUnit, setReaderUnit] = useState<CurriculumUnit | undefined>();
  const [readerLesson, setReaderLesson] = useState<CurriculumLesson | undefined>();
  const [readerStartPage, setReaderStartPage] = useState<number>(1);
  const [targetQuizLesson, setTargetQuizLesson] = useState<CurriculumLesson | undefined>();

  useEffect(() => {
    if (!selectedBook) {
      setContentOverrides([]);
      return;
    }
    const unsubscribe = subscribeToContentOverrides(
      selectedBook,
      { uid: user?.uid, schoolId: user?.schoolId, school: user?.school, grade: selectedGrade },
      (nextOverrides) => {
        setContentOverrides(nextOverrides);
        setSelectedBook((currentBook) => currentBook ? applyCurriculumOverrides(currentBook, nextOverrides) : currentBook);
      },
      (error) => console.error('Content override subscription failed:', error),
    );
    return unsubscribe;
  }, [selectedBook?.id, selectedBook?.gradeKey, selectedBook?.subject, user?.uid, user?.schoolId, user?.school, selectedGrade]);

  // Stored items
  const [studyItems, setStudyItems] = useState<StudyAIItem[]>([]);
  const [studyQuizzes, setStudyQuizzes] = useState<StudyQuiz[]>([]);

  // Load only lightweight catalog metadata. PDF and page JSON are fetched on demand by the reader.
  useEffect(() => {
    if (user?.grade && user.grade !== selectedGrade) setSelectedGrade(user.grade);
  }, [user?.grade]);

  useEffect(() => {
    setSelectedBook(null);
    setBooksLoading(true);
    setBooksError(null);
    const unsubscribe = subscribeToCurriculumBooks(
      selectedGrade,
      { uid: user?.uid, schoolId: user?.schoolId, school: user?.school, grade: selectedGrade },
      (nextBooks) => {
        setRemoteBooks(nextBooks);
        setBooksLoading(false);
      },
      (error) => {
        console.error('Curriculum subscription failed:', error);
        setBooksError(error.message || 'تعذر تحميل كتالوج المناهج');
        setBooksLoading(false);
      },
    );
    return unsubscribe;
  }, [selectedGrade, user?.uid, user?.schoolId, user?.school]);

  const books = remoteBooks.map((book) => {
    const custom = getCustomUnits(book.id);
    return custom && custom.length > 0 ? { ...book, units: custom } : book;
  });


  // Load local items on mount or user change
  useEffect(() => {
    if (user?.uid) {
      const items = getLocalStudyItems(user.uid);
      setStudyItems(items);
      const quizzes = getLocalQuizzes(user.uid);
      setStudyQuizzes(quizzes);
    }
  }, [user?.uid]);

  const filteredBooks = books.filter(b => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenLessonInReader = (unit: CurriculumUnit, lesson: CurriculumLesson, startPage: number) => {
    setReaderUnit(unit);
    setReaderLesson(lesson);
    setReaderStartPage(startPage);
    setActiveTab('reader');
  };

  const handleStartQuizForLesson = (unit: CurriculumUnit, lesson: CurriculumLesson) => {
    setTargetQuizLesson(lesson);
    setActiveTab('quizzes');
  };

  const handleUnitsUpdated = (updatedUnits: CurriculumUnit[]) => {
    if (selectedBook) {
      setSelectedBook({ ...selectedBook, units: updatedUnits });
    }
  };

  const gradeOptions = YEMEN_GRADE_OPTIONS.map((option) => option.labelAr);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* VIEW A: Subject Detail & Interactive Workspace                 */}
      {/* ------------------------------------------------------------- */}
      {selectedBook ? (
        <div className="space-y-6">
          {/* Breadcrumb & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBook(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-gray-200 transition-colors"
                title={language === 'en' ? 'Back to All Subjects' : 'الرجوع لجميع المواد'}
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedBook.title}
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {selectedBook.grade}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedBook.units.length} وحدات • {selectedBook.units.reduce((acc, u) => acc + u.lessons.length, 0)} درساً • {selectedBook.totalPageCount} صفحة
                </p>
              </div>
            </div>

            {/* Offline ready badge */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'en' ? 'Offline Ready' : 'جاهز للمذاكرة بدون نت'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('units')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'units'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{language === 'en' ? 'Units & Lessons' : 'فهرس الوحدات والدروس'}</span>
            </button>

            <button
              onClick={() => setActiveTab('reader')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'reader'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{language === 'en' ? 'Interactive Reader' : 'القارئ التفاعلي الذكي'}</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{language === 'en' ? 'My AI Notes' : 'شروحاتي وتلاخيصي'}</span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full">
                {studyItems.filter(i => i.curriculumId === selectedBook.id).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('quizzes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'quizzes'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Brain className="w-4 h-4 text-purple-500" />
              <span>{language === 'en' ? 'Practice Quizzes' : 'بنك الأسئلة واختباراتي'}</span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded-full">
                {studyQuizzes.filter(q => q.curriculumId === selectedBook.id).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'exams'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>{language === 'en' ? 'Class Exams' : 'اختبارات الفصل الرسمية'}</span>
            </button>
          </div>

          {/* Tab Body */}
          {activeTab === 'units' && (
            <UnitsLessonsTree
              book={selectedBook}
              onSelectLesson={handleOpenLessonInReader}
              onStartQuizForLesson={handleStartQuizForLesson}
              onUnitsUpdated={handleUnitsUpdated}
            />
          )}

          {activeTab === 'reader' && (
            <InteractiveReader
              book={selectedBook}
              initialUnit={readerUnit}
              initialLesson={readerLesson}
              initialPage={readerStartPage}
              onOpenQuizzes={() => setActiveTab('quizzes')}
              onOpenNotes={() => setActiveTab('notes')}
              onSavedNewItem={(item) => setStudyItems([item, ...studyItems])}
            />
          )}

          {activeTab === 'notes' && (
            <StudyNotesView
              book={selectedBook}
              items={studyItems}
              onItemsChange={setStudyItems}
            />
          )}

          {activeTab === 'quizzes' && (
            <StudyQuizzesView
              book={selectedBook}
              quizzes={studyQuizzes}
              onQuizzesChange={setStudyQuizzes}
              targetLesson={targetQuizLesson}
            />
          )}

          {activeTab === 'exams' && (
            <StudentExams />
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* VIEW B: Subjects Catalog Grid                                  */
        /* ------------------------------------------------------------- */
        <div className="space-y-6">
          {/* Header & Grade Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {language === 'en' ? 'Official Curriculums & Subjects' : 'المناهج والمقررات الدراسية الرسمية'}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {filteredBooks.length} مواد
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {language === 'en'
                  ? 'Access interactive textbooks, unit breakdowns, AI lesson explainers, and customized offline study tools.'
                  : 'استعرض الكتب المدرسية التفاعلية، فهرس الوحدات والدروس، المساعد الذكي للشرح، وبنك الاختبارات التدريبية بدون نت.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Grade Selector */}
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-4 py-2 text-xs font-semibold rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {gradeOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search subject...' : 'بحث في المواد...'}
                  className="pl-9 pr-9 py-2 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subjects Grid */}
          {booksLoading ? (
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-8 text-center text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
              جاري تحميل كتالوج المواد الخاص بصفك...
            </div>
          ) : booksError ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
              {booksError}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              لا توجد مناهج منشورة لهذا الصف حالياً. سيظهر الكتاب تلقائياً بعد رفعه من لوحة الإدارة وتسجيله في كتالوج المناهج.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map((book) => {
              const bookNotesCount = studyItems.filter(i => i.curriculumId === book.id).length;
              const bookQuizzesCount = studyQuizzes.filter(q => q.curriculumId === book.id).length;

              return (
                <div
                  key={book.id}
                  onClick={() => {
                    setSelectedBook(applyCurriculumOverrides(book, contentOverrides));
                    setActiveTab('units');
                  }}
                  className="group bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        {book.subject}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {book.grade} • {book.semester || 'الفصل الدراسي الأول'}
                      </p>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px]">
                      <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-xl text-center">
                        <span className="block font-bold text-gray-800 dark:text-gray-200">{book.units.length}</span>
                        <span className="text-[10px] text-gray-400">وحدات</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-xl text-center">
                        <span className="block font-bold text-gray-800 dark:text-gray-200">
                          {book.units.reduce((acc, u) => acc + u.lessons.length, 0)}
                        </span>
                        <span className="text-[10px] text-gray-400">دروس</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-xl text-center">
                        <span className="block font-bold text-gray-800 dark:text-gray-200">{book.totalPageCount}</span>
                        <span className="text-[10px] text-gray-400">صفحة</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                    <span className="flex items-center gap-1">
                      {bookNotesCount > 0 && (
                        <span className="text-[10px] text-amber-600 font-normal bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                          {bookNotesCount} شروحات
                        </span>
                      )}
                      <span>فتح المنهج والدروس</span>
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
