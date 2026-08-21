import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { CurriculumBook, CurriculumUnit, CurriculumLesson, StudyAIItem } from '../../types/curriculum';
import {
  getLastReadProgress,
  getReaderPreferences,
  saveLastReadProgress,
  saveReaderPreferences,
  saveStudyAIItem,
} from '../../lib/studyStorage';
import { cacheBookOffline, isBookCachedOffline, loadBookPage } from '../../lib/curriculumService';
import AIContextMenu from '../ai/AIContextMenu';
import {
  BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Sparkles, Brain, Download, Check, ListTree, Layers,
  Volume2, FileText, ArrowRight, Languages, Moon, Sun, Loader2, RotateCcw
} from 'lucide-react';
import { getGeminiAI } from '../../lib/gemini';
import { toast } from 'sonner';


type PageAiAction = 'explain' | 'summary' | 'translate';

function clampPage(page: number, totalPageCount: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPageCount, 1));
}

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
  const readerScope = `${user?.uid || 'anonymous'}:${book.id}`;
  const savedPreferences = getReaderPreferences(readerScope);
  const savedProgress = getLastReadProgress(book.id, user?.uid);
  const [currentPage, setCurrentPage] = useState<number>(() => clampPage(
    initialPage || initialLesson?.startPage || savedProgress?.pageNumber || 1,
    book.totalPageCount,
  ));
  const [zoom, setZoom] = useState(() => Math.min(Math.max(savedPreferences.zoom || 100, 60), 180));
  const [nightMode, setNightMode] = useState(Boolean(savedPreferences.nightMode));
  const [selectedText, setSelectedText] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDownloadedOffline, setIsDownloadedOffline] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pageText, setPageText] = useState('');
  const [translatedPageText, setTranslatedPageText] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [pageAiResponse, setPageAiResponse] = useState<string | null>(null);
  const [pageAiAction, setPageAiAction] = useState<'explain' | 'summary' | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Determine current unit and lesson based on currentPage
  const currentUnit = book.units.find(u => currentPage >= u.startPage && currentPage <= u.endPage) || book.units[0];
  const currentLesson = currentUnit?.lessons.find(l => currentPage >= l.startPage && currentPage <= l.endPage) || currentUnit?.lessons[0];
  const progressPercent = Math.round((currentPage / Math.max(book.totalPageCount, 1)) * 100);
  const sourceText = pageText || currentLesson?.sampleContent || currentLesson?.title || '';
  const visiblePageText = showTranslation && translatedPageText ? translatedPageText : sourceText;

  useEffect(() => {
    if (initialPage || initialLesson) {
      setCurrentPage(clampPage(initialPage || initialLesson?.startPage || 1, book.totalPageCount));
    }
  }, [book.id, initialPage, initialLesson?.id, initialLesson?.startPage, book.totalPageCount]);

  useEffect(() => {
    saveReaderPreferences(readerScope, { nightMode, zoom });
  }, [readerScope, nightMode, zoom]);

  // Fetch only the requested page from the pre-processed JSON manifest.
  useEffect(() => {
    let cancelled = false;
    setPageLoading(true);
    setPageError(null);
    setTranslatedPageText('');
    setShowTranslation(false);
    setPageAiResponse(null);
    setPageAiAction(null);
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

  // Save last read progress per student so shared devices do not mix records.
  useEffect(() => {
    saveLastReadProgress({
      curriculumId: book.id,
      studentId: user?.uid,
      unitId: currentUnit?.id,
      lessonId: currentLesson?.id,
      pageNumber: currentPage,
      lastReadAt: new Date().toISOString(),
    });
  }, [book.id, user?.uid, currentUnit?.id, currentLesson?.id, currentPage]);

  useEffect(() => {
    let cancelled = false;
    isBookCachedOffline(book).then((cached) => {
      if (!cancelled) setIsDownloadedOffline(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [book.id, book.manifestUrl, book.textIndexUrl]);

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
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const handleCloseMenu = () => {
    setMenuPosition(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleDownloadOffline = async () => {
    setOfflineLoading(true);
    try {
      const cached = await cacheBookOffline(book);
      if (!cached) {
        toast.error(language === 'en' ? 'This book has no processed page manifest yet.' : 'لا يوجد فهرس صفحات معالج لهذا الكتاب حتى الآن.');
        return;
      }
      setIsDownloadedOffline(true);
      toast.success(language === 'en' ? 'The processed page text is ready for offline study.' : 'تم حفظ نصوص صفحات الكتاب المعالجة للمذاكرة دون اتصال.');
    } catch (error) {
      console.error('Offline cache failed:', error);
      toast.error(language === 'en' ? 'Could not cache this book.' : 'تعذر حفظ الكتاب للمذاكرة دون اتصال.');
    } finally {
      setOfflineLoading(false);
    }
  };

  const createSavedAiItem = async (action: PageAiAction, responseText: string): Promise<void> => {
    if (!user?.uid || !responseText) return;
    const item: StudyAIItem = {
      id: `ai-page-${action}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: user.uid,
      curriculumId: book.id,
      subject: book.subject,
      unitId: currentUnit?.id,
      unitTitle: currentUnit?.title,
      lessonId: currentLesson?.id,
      lessonTitle: currentLesson?.title,
      pageNumber: currentPage,
      type: action,
      selectedText: sourceText.slice(0, 1200),
      aiResponse: responseText,
      createdAt: new Date().toISOString(),
      isBookmarked: true,
    };
    await saveStudyAIItem(item);
    onSavedNewItem?.(item);
  };

  const handlePageAiAction = async (action: PageAiAction) => {
    if (!sourceText.trim()) {
      toast.error(language === 'en' ? 'There is no page text to process yet.' : 'لا يوجد نص للصفحة لمعالجته بعد.');
      return;
    }
    if (action === 'translate' && translatedPageText) {
      setShowTranslation((previous) => !previous);
      return;
    }

    setAiGenerating(true);
    try {
      const answerLanguage = language === 'en' ? 'English' : 'Arabic';
      const prompt = action === 'translate'
        ? `Translate the following official school curriculum page accurately into ${answerLanguage}. Preserve headings, formulas, examples, and paragraph order. Return only the translation.\n\nPAGE ${currentPage}:\n${sourceText}`
        : action === 'explain'
          ? `You are an expert school tutor. Explain this official curriculum page in clear ${answerLanguage} for a Yemeni school student. Define difficult terms, connect ideas to simple examples, and do not invent facts not supported by the page. Use short headings and revision-friendly points.\n\nSUBJECT: ${book.subject}\nLESSON: ${currentLesson?.title || ''}\nPAGE ${currentPage}:\n${sourceText}`
          : `You are an expert school tutor. Summarize this official curriculum page in ${answerLanguage} for quick revision. Keep the key definitions, rules, examples, and conclusions. Use concise headings and bullet points.\n\nSUBJECT: ${book.subject}\nLESSON: ${currentLesson?.title || ''}\nPAGE ${currentPage}:\n${sourceText}`;

      const response = await getGeminiAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      const responseText = response.text?.trim() || '';
      if (!responseText) throw new Error('Empty AI response');

      if (action === 'translate') {
        setTranslatedPageText(responseText);
        setShowTranslation(true);
        toast.success(language === 'en' ? 'Page translated.' : 'تمت ترجمة الصفحة.');
      } else {
        setPageAiAction(action);
        setPageAiResponse(responseText);
        toast.success(language === 'en' ? 'Page guidance generated and saved.' : 'تم إنشاء شرح الصفحة وحفظه في مذكراتك.');
      }
      await createSavedAiItem(action, responseText);
    } catch (error) {
      console.error('Page AI action failed:', error);
      toast.error(language === 'en' ? 'The AI could not process this page.' : 'تعذر على الذكاء الاصطناعي معالجة الصفحة.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      toast.error(language === 'en' ? 'Text to speech is not supported in this browser.' : 'القراءة الصوتية غير مدعومة في هذا المتصفح.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(visiblePageText || book.title);
    utterance.lang = language === 'en' ? 'en-US' : 'ar-SA';
    window.speechSynthesis.speak(utterance);
    toast.success(language === 'en' ? 'Reading the visible page aloud.' : 'جاري قراءة النص الظاهر صوتياً.');
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] rounded-2xl overflow-hidden border shadow-md ${nightMode ? 'bg-[#0f1117] border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
      {/* Top Main Toolbar */}
      <div className={`border-b p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 ${nightMode ? 'bg-[#171923] border-slate-700' : 'bg-white border-gray-200'}`}>
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
            onClick={() => handlePageAiAction('explain')}
            disabled={aiGenerating || pageLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all disabled:opacity-50"
            title={language === 'en' ? 'AI explain this page' : 'شرح الصفحة بالذكاء الاصطناعي'}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">{language === 'en' ? 'Explain page' : 'اشرح الصفحة'}</span>
          </button>

          <button
            onClick={() => handlePageAiAction('summary')}
            disabled={aiGenerating || pageLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-all disabled:opacity-50"
            title={language === 'en' ? 'AI summarize this page' : 'تلخيص الصفحة'}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">{language === 'en' ? 'Summarize page' : 'لخص الصفحة'}</span>
          </button>

          <button
            onClick={() => handlePageAiAction('translate')}
            disabled={aiGenerating || pageLoading}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${showTranslation ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}
            title={language === 'en' ? 'Translate this page' : 'ترجمة الصفحة كاملة'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{showTranslation ? (language === 'en' ? 'Original page' : 'النص الأصلي') : (language === 'en' ? 'Translate page' : 'ترجم الصفحة')}</span>
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
            disabled={offlineLoading}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 ${
              isDownloadedOffline
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            }`}
            title={language === 'en' ? 'Available Offline' : 'تحميل وحفظ للمذاكرة بدون نت'}
          >
            {offlineLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isDownloadedOffline ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">
              {isDownloadedOffline ? (language === 'en' ? 'Saved Offline' : 'محفوظ محلياً') : (language === 'en' ? 'Save Offline' : 'مذاكرة بدون نت')}
            </span>
          </button>

          {/* Audio Read */}
          <button
            onClick={handleReadAloud}
            className={`p-1.5 rounded-xl ${nightMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            title={language === 'en' ? 'Read visible page aloud' : 'قراءة النص الظاهر صوتياً'}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setNightMode((previous) => !previous)}
            className={`p-1.5 rounded-xl ${nightMode ? 'text-amber-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            title={nightMode ? (language === 'en' ? 'Use day mode' : 'تفعيل الوضع النهاري') : (language === 'en' ? 'Use night mode' : 'تفعيل الوضع الليلي')}
          >
            {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Zoom controls */}
          <div className={`flex items-center gap-1 rounded-xl p-1 ${nightMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <button
              onClick={() => setZoom(Math.max(60, zoom - 10))}
              className={`p-1 rounded ${nightMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-white'}`}
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className={`text-[11px] font-semibold w-8 text-center ${nightMode ? 'text-slate-300' : 'text-gray-700'}`}>{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(180, zoom + 10))}
              className={`p-1 rounded ${nightMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-white'}`}
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
          <div className={`w-72 p-4 overflow-y-auto shrink-0 transition-all z-20 shadow-lg border-r ${nightMode ? 'bg-[#171923] border-slate-700' : 'bg-white border-gray-200'}`}>
              <div className={`flex items-center justify-between mb-3 pb-2 border-b ${nightMode ? 'border-slate-700' : 'border-gray-100'}`}>
                <span className={`text-xs font-bold flex items-center gap-1.5 ${nightMode ? 'text-white' : 'text-gray-800'}`}>
                <Layers className="w-4 h-4 text-blue-600" />
                {language === 'en' ? 'Curriculum Structure' : 'فهرس الوحدات والدروس'}
              </span>
              <span className="text-[10px] text-gray-400">{book.units.length} وحدات</span>
            </div>

            <div className="space-y-3">
              {book.units.map((unit) => (
                <div key={unit.id} className="space-y-1">
                  <div className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center justify-between ${nightMode ? 'text-slate-200 bg-slate-800' : 'text-gray-700 bg-gray-50'}`}>
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
                              : nightMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'
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
        <div className={`flex-1 overflow-auto p-4 sm:p-8 flex justify-center selection:bg-blue-200 dark:selection:bg-blue-900/60 ${nightMode ? 'bg-[#0f1117]' : 'bg-gray-100'}`}>
          <div
            ref={contentRef}
            className={`shadow-xl p-6 sm:p-12 max-w-3xl w-full min-h-full rounded-2xl border transition-all flex flex-col justify-between ${nightMode ? 'bg-[#171923] text-slate-100 border-slate-700' : 'bg-white text-gray-800 border-gray-200/80'}`}
            style={{ fontSize: `${zoom}%` }}
          >
            <div>
              {/* Unit and Lesson Header Banner */}
              <div className={`border-b pb-4 mb-6 ${nightMode ? 'border-slate-700' : 'border-gray-100'}`}>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">
                  {currentUnit?.title}
                </span>
                <h1 className={`text-xl sm:text-2xl font-extrabold mt-1 ${nightMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentLesson?.title || book.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'en' ? `Page ${currentPage} of ${book.totalPageCount}` : `الصفحة ${currentPage} من إجمالي ${book.totalPageCount} صفحة`}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {language === 'en' ? 'Select any word or paragraph to use AI Assistant' : 'حدد أي نص بالماوس أو بالضغط المطول لطلب الشرح، التلخيص أو الترجمة فورياً'}
                  </span>
                </div>
                <div className={`mt-4 h-1.5 rounded-full overflow-hidden ${nightMode ? 'bg-slate-800' : 'bg-gray-100'}`} aria-label={`تقدم القراءة ${progressPercent}%`}>
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Page Text Body */}
              <div className={`space-y-6 leading-relaxed text-sm sm:text-base ${nightMode ? 'text-slate-200' : 'text-gray-800'}`}>
                {pageLoading ? (
                  <div className="p-6 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-center">جاري تحميل نص الصفحة...</div>
                ) : visiblePageText ? (
                  <div className="space-y-4">
                    {showTranslation && translatedPageText && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-300"><Languages className="w-4 h-4" />{language === 'en' ? 'Translated page' : 'الترجمة المعروضة للصفحة'}</div>
                    )}
                    <div className="whitespace-pre-line font-normal leading-loose">{visiblePageText}</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pageError && <p className="text-amber-700 dark:text-amber-300">{pageError}</p>}
                    <p>لا يوجد نص مفهرس لهذه الصفحة بعد. يمكنك فتح نسخة PDF المرئية أو رفع ملف JSON المعالج من لوحة الإدارة.</p>
                    <p className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border-r-4 border-blue-600">حدد أي فقرة من النص بعد ربط manifestUrl ليستخدمها المساعد الذكي في الشرح والتلخيص وتوليد الأسئلة.</p>
                  </div>
                )}
              </div>

              {pageAiResponse && (
                <div className={`mt-8 rounded-2xl border p-4 ${nightMode ? 'bg-slate-900/70 border-slate-700' : 'bg-indigo-50/70 border-indigo-100'}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300"><Sparkles className="w-4 h-4" />{pageAiAction === 'explain' ? (language === 'en' ? 'AI page explanation' : 'شرح الصفحة بالذكاء الاصطناعي') : (language === 'en' ? 'AI page summary' : 'تلخيص الصفحة بالذكاء الاصطناعي')}</div>
                    <button onClick={() => setPageAiResponse(null)} className="text-xs text-gray-400 hover:text-gray-600" title={language === 'en' ? 'Dismiss' : 'إغلاق'}>×</button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{pageAiResponse}</div>
                  {onOpenNotes && <button onClick={onOpenNotes} className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-300 hover:underline">{language === 'en' ? 'Open saved notes' : 'فتح المذكرات المحفوظة'}</button>}
                </div>
              )}
            </div>

            {/* Bottom Tip */}
            <div className={`mt-12 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${nightMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span className={`text-xs ${nightMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {language === 'en' ? `Page progress: ${progressPercent}% — test yourself now!` : `تقدم القراءة: ${progressPercent}% — هل انتهيت؟ اختبر نفسك الآن.`}
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
      <div className={`border-t p-3 flex items-center justify-between shrink-0 ${nightMode ? 'bg-[#171923] border-slate-700' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{language === 'en' ? 'Previous Page' : 'الصفحة السابقة'}</span>
        </button>

        <div className={`flex items-center gap-2 text-xs font-medium ${nightMode ? 'text-slate-300' : 'text-gray-700'}`}>

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
            className={`w-14 px-2 py-1 text-center font-bold text-xs rounded-lg border ${nightMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-300 bg-white'}`}
          />
          <span>{language === 'en' ? `of ${book.totalPageCount}` : `من ${book.totalPageCount}`}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const progress = getLastReadProgress(book.id, user?.uid);
              setCurrentPage(clampPage(progress?.pageNumber || 1, book.totalPageCount));
            }}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs ${nightMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            title={language === 'en' ? 'Return to saved page' : 'العودة إلى آخر صفحة محفوظة'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {language === 'en' ? 'Resume' : 'متابعة'}
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(book.totalPageCount, currentPage + 1))}
            disabled={currentPage >= book.totalPageCount}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs"
        >
          <span>{language === 'en' ? 'Next Page' : 'الصفحة التالية'}</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
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
