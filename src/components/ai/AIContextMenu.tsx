import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { getGeminiAI } from '../../lib/gemini';
import { Languages, Volume2, HelpCircle, Brain, Loader2, X, BookmarkCheck, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';
import { saveStudyAIItem } from '../../lib/studyStorage';
import { StudyAIItem } from '../../types/curriculum';


interface AIContextMenuProps {
  selectedText: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  curriculumId?: string;
  subject?: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  pageNumber?: number;
  onSavedItem?: (item: StudyAIItem) => void;
}

export default function AIContextMenu({
  selectedText,
  position,
  onClose,
  curriculumId = 'general',
  subject = 'عام',
  unitId,
  unitTitle,
  lessonId,
  lessonTitle,
  pageNumber,
  onSavedItem,
}: AIContextMenuProps) {
  const { language, user } = useStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position || !selectedText) return null;

  const handleAction = async (action: 'translate' | 'explain' | 'quiz' | 'summary' | 'custom_question', customQuery?: string) => {
    setLoading(true);
    setActiveAction(action);
    setResult(null);
    setSavedSuccess(false);

    try {
      let prompt = '';
      if (action === 'translate') {
        prompt = `Translate the following text accurately into ${language === 'en' ? 'Arabic' : 'English'}:\n\n"${selectedText}"`;
      } else if (action === 'explain') {
        prompt = `You are a friendly, encouraging school teacher. Explain the following educational concept simply and clearly in ${language === 'en' ? 'English' : 'Arabic'} with bullet points and practical examples:\n\n"${selectedText}"`;
      } else if (action === 'summary') {
        prompt = `Summarize the following educational text into concise, high-yield bullet points for easy revision in ${language === 'en' ? 'English' : 'Arabic'}:\n\n"${selectedText}"`;
      } else if (action === 'quiz') {
        prompt = `Generate 2 multiple-choice questions with 4 choices and correct answer explanation based on the following text in ${language === 'en' ? 'English' : 'Arabic'}:\n\n"${selectedText}"`;
      } else if (action === 'custom_question' && customQuery) {
        prompt = `Based on the following educational text:\n"${selectedText}"\n\nAnswer the student's question clearly in ${language === 'en' ? 'English' : 'Arabic'}:\n"${customQuery}"`;
      }

      const response = await getGeminiAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const responseText = response.text || '';
      setResult(responseText);

      // Auto save to local study notes history
      if (user?.uid && responseText) {
        const item: StudyAIItem = {
          id: 'ai-note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          studentId: user.uid,
          curriculumId,
          subject,
          unitId,
          unitTitle,
          lessonId,
          lessonTitle,
          pageNumber,
          type: action === 'summary' ? 'summary' : action === 'quiz' ? 'quiz' : action === 'translate' ? 'translate' : action === 'custom_question' ? 'custom_question' : 'explain',
          selectedText,
          aiResponse: responseText,
          createdAt: new Date().toISOString(),
          isBookmarked: true,
        };
        await saveStudyAIItem(item);
        setSavedSuccess(true);
        if (onSavedItem) {
          onSavedItem(item);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(language === 'en' ? 'Failed to process AI request' : 'تعذر إتمام طلب الذكاء الاصطناعي');
    } finally {
      setLoading(false);
    }
  };

  const handleTTS = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.lang = language === 'en' ? 'en-US' : 'ar-SA';
      window.speechSynthesis.speak(utterance);
      toast.success(language === 'en' ? 'Reading text aloud...' : 'جاري القراءة الصوتية...');
    } else {
      toast.error('Text-to-speech not supported in this browser');
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-88 max-w-[90vw] overflow-hidden backdrop-blur-md"
      style={{
        top: Math.max(10, position.y + 10),
        left: Math.min(Math.max(10, position.x - 160), window.innerWidth - 360),
      }}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-800 dark:text-white">
              {language === 'en' ? 'AI Study Assistant' : 'المساعد التعليمي الذكي'}
            </span>
            {lessonTitle && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                {lessonTitle} {pageNumber ? `(ص ${pageNumber})` : ''}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected text preview */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
        "{selectedText}"
      </div>

      {/* Initial Actions Grid */}
      {!result && !loading && !showCustomInput && (
        <div className="p-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction('explain')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 transition-all text-right font-medium text-xs shadow-sm hover:shadow"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{language === 'en' ? 'Explain simply' : 'اشرح لي ببساطة'}</span>
          </button>

          <button
            onClick={() => handleAction('summary')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 transition-all text-right font-medium text-xs shadow-sm hover:shadow"
          >
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{language === 'en' ? 'Summarize' : 'لخص النقاط'}</span>
          </button>

          <button
            onClick={() => handleAction('quiz')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40 transition-all text-right font-medium text-xs shadow-sm hover:shadow"
          >
            <Brain className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{language === 'en' ? 'Quiz me' : 'اختبرني في النص'}</span>
          </button>

          <button
            onClick={() => handleAction('translate')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 transition-all text-right font-medium text-xs shadow-sm hover:shadow"
          >
            <Languages className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{language === 'en' ? 'Translate' : 'ترجمة فورية'}</span>
          </button>

          <button
            onClick={handleTTS}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/40 transition-all text-right font-medium text-xs shadow-sm hover:shadow"
          >
            <Volume2 className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{language === 'en' ? 'Read Aloud' : 'قراءة صوتية'}</span>
          </button>

          <button
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 transition-all text-right font-medium text-xs shadow-sm hover:shadow"
          >
            <Send className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{language === 'en' ? 'Ask custom Q' : 'طرح سؤال مخصص'}</span>
          </button>
        </div>
      )}

      {/* Custom Question Input */}
      {showCustomInput && !loading && !result && (
        <div className="p-3 space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {language === 'en' ? 'What would you like to ask about this text?' : 'ماذا تريد أن تسأل عن هذا النص؟'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customQuestion.trim()) {
                  handleAction('custom_question', customQuestion.trim());
                }
              }}
              placeholder={language === 'en' ? 'Type your question...' : 'اكتب سؤالك هنا...'}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => customQuestion.trim() && handleAction('custom_question', customQuestion.trim())}
              disabled={!customQuestion.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowCustomInput(false)}
            className="text-[11px] text-gray-500 hover:underline"
          >
            {language === 'en' ? 'Cancel' : 'إلغاء'}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-6 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {language === 'en' ? 'Generating smart explanation...' : 'جاري توليد الشرح بالذكاء الاصطناعي...'}
          </p>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="p-4 max-h-72 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {activeAction === 'explain' && (language === 'en' ? 'Explanation' : 'الشرح المبسط')}
              {activeAction === 'summary' && (language === 'en' ? 'Summary' : 'التلخيص')}
              {activeAction === 'quiz' && (language === 'en' ? 'Practice Quiz' : 'أسئلة تدريبية')}
              {activeAction === 'translate' && (language === 'en' ? 'Translation' : 'الترجمة')}
              {activeAction === 'custom_question' && (language === 'en' ? 'Answer' : 'الإجابة الذكية')}
            </span>

            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <BookmarkCheck className="w-3 h-3" />
                {language === 'en' ? 'Saved to Notes' : 'حُفظ في مذكراتي'}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            {result}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setResult(null);
                setShowCustomInput(false);
              }}
              className="flex-1 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-colors text-center"
            >
              {language === 'en' ? 'Back to tools' : 'الرجوع للأدوات'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              {language === 'en' ? 'Done' : 'تم'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
