import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { GoogleGenAI } from '@google/genai';
import { Languages, Volume2, HelpCircle, Brain, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AIContextMenuProps {
  selectedText: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export default function AIContextMenu({ selectedText, position, onClose }: AIContextMenuProps) {
  const { language } = useStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
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

  const handleAction = async (action: 'translate' | 'explain' | 'quiz') => {
    setLoading(true);
    setActiveAction(action);
    setResult(null);

    try {
      let prompt = '';
      if (action === 'translate') {
        prompt = `Translate the following text to ${language === 'en' ? 'Arabic' : 'English'}:\n\n"${selectedText}"`;
      } else if (action === 'explain') {
        prompt = `Explain the following text simply for a high school student in ${language === 'en' ? 'English' : 'Arabic'}:\n\n"${selectedText}"`;
      } else if (action === 'quiz') {
        prompt = `Generate a single multiple-choice question based on the following text in ${language === 'en' ? 'English' : 'Arabic'}:\n\n"${selectedText}"`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setResult(response.text || '');
    } catch (error) {
      console.error(error);
      toast.error('Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleTTS = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.lang = language === 'en' ? 'en-US' : 'ar-SA';
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech not supported in this browser');
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-80 overflow-hidden"
      style={{
        top: position.y + 10,
        left: Math.min(position.x, window.innerWidth - 320),
      }}
    >
      <div className="p-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'en' ? 'AI Assistant' : 'المساعد الذكي'}
        </span>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {!result && !loading && (
        <div className="p-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction('translate')}
            className="flex flex-col items-center justify-center p-3 gap-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Languages className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium">{language === 'en' ? 'Translate' : 'ترجمة'}</span>
          </button>
          <button
            onClick={() => handleAction('explain')}
            className="flex flex-col items-center justify-center p-3 gap-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-green-500" />
            <span className="text-xs font-medium">{language === 'en' ? 'Explain' : 'اشرح لي'}</span>
          </button>
          <button
            onClick={() => handleAction('quiz')}
            className="flex flex-col items-center justify-center p-3 gap-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-medium">{language === 'en' ? 'Quiz Me' : 'اختبرني'}</span>
          </button>
          <button
            onClick={handleTTS}
            className="flex flex-col items-center justify-center p-3 gap-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Volume2 className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-medium">{language === 'en' ? 'Read Aloud' : 'قراءة صوتية'}</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'AI is thinking...' : 'الذكاء الاصطناعي يفكر...'}
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            {activeAction === 'translate' && <Languages className="w-4 h-4 text-blue-500" />}
            {activeAction === 'explain' && <HelpCircle className="w-4 h-4 text-green-500" />}
            {activeAction === 'quiz' && <Brain className="w-4 h-4 text-purple-500" />}
            <span className="text-sm font-semibold capitalize text-gray-900 dark:text-white">
              {activeAction} Result
            </span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
          <button
            onClick={() => setResult(null)}
            className="mt-4 w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {language === 'en' ? 'Back to options' : 'العودة للخيارات'}
          </button>
        </div>
      )}
    </div>
  );
}
