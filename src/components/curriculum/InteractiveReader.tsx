import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { CurriculumBook, CurriculumUnit, CurriculumLesson, StudyAIItem } from '../../types/curriculum';
import { saveLastReadProgress, getLastReadProgress } from '../../lib/studyStorage';
import { loadBookPage } from '../../lib/curriculumService';
import AIContextMenu from '../ai/AIContextMenu';
import {
  BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Sparkles, Brain, Download, Check, ListTree, Layers,
  Volume2, Maximize, FileText, ArrowRight
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface InteractiveReaderProps {
  book: CurriculumBook;
  initialUnit?: CurriculumUnit;
  initialLesson?: CurriculumLesson;
  initialPage?: number;
  onOpenQuizzes?: () => void;
  onOpenNotes?: () => void;
  onSavedNewItem?: (item: StudyAIItem) => void;
}

export default function InteractiveReader({
  book,
  initialUnit,
  initialLesson,
  initialPage,
  onOpenQuizzes,
  onOpenNotes,
  onSavedNewItem,
}: InteractiveReaderProps) {
  const { language, user } = useStore();
  const [currentPage, setCurrentPage] = useState<number>(initialPage || initialLesson?.startPage || 1);
  const [zoom, setZoom] = useState(100);
  const [selectedText, setSelectedText] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDownloadedOffline, setIsDownloadedOffline] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pageText, setPageText] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Determine current unit and lesson based on currentPage
  const currentUnit = book.units.find(u => currentPage >= u.startPage && currentPage <= u.endPage) || book.units[0];
  const currentLesson = currentUnit?.lessons.find(l => currentPage >= l.startPage && currentPage <= l.endPage) || currentUnit?.lessons[0];

  // Fetch only the requested page from the pre-processed JSON manifest.
  useEffect(() => {
    let cancelled = false;
    setPageLoading(true);
    setPageError(null);
    loadBookPage(book, currentPage)
      .then((text) => {
        if (!cancelled) setPageText(text);
      })
      .catch((error) => {
        console.error('Page content load failed:', error);
        if (!cancelled) {
          setPageText('');
          setPageError(error.message || 'تعذر تحميل نص الصفحة');
        }
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [book.id, book.manifestUrl, book.textIndexUrl, currentPage]);

  // Save last read progress
  useEffect(() => {
    saveLastReadProgress({
      curriculumId: book.id,
      unitId: currentUnit?.id,
      lessonId: currentLesson?.id,
      pageNumber: currentPage,
      lastReadAt: new Date().toISOString(),
    });
  }, [book.id, currentUnit?.id, currentLesson?.id, currentPage]);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          setSelectedText(text);
          setMenuPosition({
            x: rect.left + window.scrollX + rect.width / 2,
            y: rect.bottom + window.scrollY,
          });
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCloseMenu = () => {
    setMenuPosition(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleDownloadOffline = () => {
    setIsDownloadedOffline(true);
    toast.success(
      language === 'en'
        ? 'Curriculum cached successfully for offline study!'
        : 'تم حفظ الكتاب وفهرسه محلياً في الذاكرة بنجاح! يمكنك الآن المذاكرة بدون إنترنت.'
    );
  };

  const handleLessonAiAction = async (action: 'explain' | 'summary') => {
    if (!currentLesson) return;
    setAiGenerating(true);
    try {
      const sourceText = pageText || currentLesson.sampleContent || currentLesson.title;
      const prompt = action === 'explain'
        ? `You are an expert tutor. Explain the following official curriculum text clearly with examples. Answer in ${language === 'en' ? 'English' : 'Arabic'}. Lesson: "${currentLesson.title}". Subject: "${book.subject}".\n\nTEXT:\n${sourceText}`
        : `You are an expert tutor. Summarize the following official curriculum text into structured revision points. Answer in ${language === 'en' ? 'English' : 'Arabic'}. Lesson: "${currentLesson.title}". Subject: "${book.subject}".\n\nTEXT:\n${sourceText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const responseText = response.text || '';
      if (user?.uid && responseText) {
        const newItem: StudyAIItem = {
          id: 'ai-lesson-' + Date.now(),
          studentId: user.uid,
          curriculumId: book.id,
          subject: book.subject,
          unitId: currentUnit?.id,
          unitTitle: currentUnit?.title,
          lessonId: currentLesson?.id,
          lessonTitle: currentLesson?.title,
          pageNumber: currentPage,
          type: action,
          selectedText: currentLesson.title,
          aiResponse: responseText,
          createdAt: new Date().toISOString(),
          isBookmarked: true,
        };
        if (onSavedNewItem) onSavedNewItem(newItem);
        toast.success(
          language === 'en'
            ? 'Lesson summary generated and saved to your Notes tab!'
            : 'تم توليد الشرح/التلخيص وحفظه في تبويب مذكراتي!'
        );
        if (onOpenNotes) onOpenNotes();
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'en' ? 'Failed to generate AI note' : 'تعذر توليد الملاحظة بالذكاء الاصطناعي');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      const textToRead = pageText || currentLesson?.sampleContent || currentLesson?.title || book.title;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'en' ? 'en-US' : 'ar-SA';
      window.speechSynthesis.speak(utterance);
      toast.success(language === 'en' ? 'Reading lesson aloud...' : 'جاري القراءة الصوتية للدرس...');
    } else {
      toast.error('Text to speech not supported in this browser');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gray-100 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
      {/* Top Main Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Title and Lesson Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showSidebar
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
            }`}
            title={language === 'en' ? 'Toggle Syllabus Tree' : 'عرض/إخفاء فهرس الوحدات والدروس'}
          >
            <ListTree className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'en' ? 'Syllabus' : 'الفهرس'}</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">{book.title}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                {book.subject}
              </span>
            </div>
            {currentLesson && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[280px] sm:max-w-md">
                {currentUnit?.title} ➔ {currentLesson.title}
              </p>
            )}
          </div>
        </div>

        {/* AI Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleLessonAiAction('explain')}
            disabled={aiGenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all disabled:opacity-50"
            title={language === 'en' ? 'AI explain this lesson' : 'شرح الدرس بالذكاء الاصطناعي'}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">{language === 'en' ? 'Explain Lesson' : 'اشرح الدرس'}</span>
          </button>

          <button
            onClick={() => handleLessonAiAction('summary')}
            disabled={aiGenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-all disabled:opacity-50"
            title={language === 'en' ? 'AI summarize this lesson' : 'تلخيص هذا الدرس'}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">{language === 'en' ? 'Summarize' : 'لخص الدرس'}</span>
          </button>

          {onOpenQuizzes && (
            <button
              onClick={onOpenQuizzes}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-all"
              title={language === 'en' ? 'Quiz Bank for this lesson' : 'بنك أسئلة واختبارات هذا الدرس'}
            >
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">{language === 'en' ? 'Lesson Quiz' : 'اختبرني'}</span>
            </button>
          )}

          {/* Offline Cache Button */}
          <button
            onClick={handleDownloadOffline}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isDownloadedOffline
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            }`}
            title={language === 'en' ? 'Available Offline' : 'تحميل وحفظ للمذاكرة بدون نت'}
          >
            {isDownloadedOffline ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">
              {isDownloadedOffline ? (language === 'en' ? 'Saved Offline' : 'محفوظ محلياً') : (language === 'en' ? 'Save Offline' : 'مذاكرة بدون نت')}
            </span>
          </button>

          {/* Audio Read */}
          <button
            onClick={handleReadAloud}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-400"
            title={language === 'en' ? 'Read Aloud' : 'قراءة صوتية'}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/80 rounded-xl p-1">
            <button
              onClick={() => setZoom(Math.max(60, zoom - 10))}
              className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-semibold w-8 text-center text-gray-700 dark:text-gray-300">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(180, zoom + 10))}
              className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Syllabus Sidebar */}
        {showSidebar && (
          <div className="w-72 bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 overflow-y-auto shrink-0 transition-all z-20 shadow-lg">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                {language === 'en' ? 'Curriculum Structure' : 'فهرس الوحدات والدروس'}
              </span>
              <span className="text-[10px] text-gray-400">{book.units.length} وحدات</span>
            </div>

            <div className="space-y-3">
              {book.units.map((unit) => (
                <div key={unit.id} className="space-y-1">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-750 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                    <span className="truncate">{unit.title}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">ص {unit.startPage}-{unit.endPage}</span>
                  </div>

                  <div className="mr-2 space-y-1">
                    {unit.lessons.map((lesson) => {
                      const isActive = currentPage >= lesson.startPage && currentPage <= lesson.endPage;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setCurrentPage(lesson.startPage);
                            if (window.innerWidth < 768) setShowSidebar(false);
                          }}
                          className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="truncate">{lesson.title}</span>
                          <span className={`text-[10px] shrink-0 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                            ص {lesson.startPage}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Viewer Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center bg-gray-100 dark:bg-gray-900 selection:bg-blue-200 dark:selection:bg-blue-900/60">
          <div
            ref={contentRef}
            className="bg-white dark:bg-gray-800 shadow-xl p-6 sm:p-12 max-w-3xl w-full min-h-full rounded-2xl border border-gray-200/80 dark:border-gray-700/80 transition-all flex flex-col justify-between"
            style={{ fontSize: `${zoom}%` }}
          >
            <div>
              {/* Unit and Lesson Header Banner */}
              <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">
                  {currentUnit?.title}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {currentLesson?.title || book.title}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'en' ? `Page ${currentPage} of ${book.totalPageCount}` : `الصفحة ${currentPage} من إجمالي ${book.totalPageCount} صفحة`}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {language === 'en' ? 'Select any word or paragraph to use AI Assistant' : 'حدد أي نص بالماوس لطلب الشرح، التلخيص أو الترجمة فورياً'}
                  </span>
                </div>
              </div>

              {/* Lesson Text Body */}
              <div className="space-y-6 text-gray-800 dark:text-gray-200 leading-relaxed text-sm sm:text-base">
                {pageLoading ? (
                  <div className="p-6 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-center">
                    جاري تحميل نص الصفحة...
                  </div>
                ) : pageText ? (
                  <div className="whitespace-pre-line font-normal leading-loose">{pageText}</div>
                ) : currentLesson?.sampleContent ? (
                  <div className="whitespace-pre-line font-normal leading-loose">{currentLesson.sampleContent}</div>
                ) : (
                  <div className="space-y-4">
                    {pageError && <p className="text-amber-700 dark:text-amber-300">{pageError}</p>}
                    <p>
                      لا يوجد نص مفهرس لهذه الصفحة بعد. يمكنك فتح نسخة PDF المرئية أو رفع ملف JSON المعالج من لوحة الإدارة.
                    </p>
                    <p className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border-r-4 border-blue-600 text-gray-700 dark:text-gray-300">
                      حدد أي فقرة من النص بعد ربط manifestUrl ليستخدمها المساعد الذكي في الشرح والتلخيص وتوليد الأسئلة.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tip */}
            <div className="mt-12 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl border border-blue-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {language === 'en' ? 'Completed this lesson? Test yourself now!' : 'هل انتهيت من قراءة هذا الدرس؟ اختبر نفسك فوراً بالذكاء الاصطناعي'}
                </span>
              </div>
              {onOpenQuizzes && (
                <button
                  onClick={onOpenQuizzes}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1"
                >
                  <span>{language === 'en' ? 'Start Quiz' : 'بدء الاختبار'}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Page Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between shrink-0">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{language === 'en' ? 'Previous Page' : 'الصفحة السابقة'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
          <span>{language === 'en' ? 'Page' : 'صفحة'}</span>
          <input
            type="number"
            value={currentPage}
            min={1}
            max={book.totalPageCount}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= book.totalPageCount) {
                setCurrentPage(val);
              }
            }}
            className="w-14 px-2 py-1 text-center font-bold text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
          <span>{language === 'en' ? `of ${book.totalPageCount}` : `من ${book.totalPageCount}`}</span>
        </div>

        <button
          onClick={() => setCurrentPage(Math.min(book.totalPageCount, currentPage + 1))}
          disabled={currentPage >= book.totalPageCount}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs"
        >
          <span>{language === 'en' ? 'Next Page' : 'الصفحة التالية'}</span>
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* Floating AI Context Menu */}
      {menuPosition && (
        <AIContextMenu
          selectedText={selectedText}
          position={menuPosition}
          onClose={handleCloseMenu}
          curriculumId={book.id}
          subject={book.subject}
          unitId={currentUnit?.id}
          unitTitle={currentUnit?.title}
          lessonId={currentLesson?.id}
          lessonTitle={currentLesson?.title}
          pageNumber={currentPage}
          onSavedItem={(item) => {
            if (onSavedNewItem) onSavedNewItem(item);
          }}
        />
      )}
    </div>
  );
}
