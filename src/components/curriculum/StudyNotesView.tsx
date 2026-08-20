import { useState } from 'react';
import { useStore } from '../../lib/store';
import { StudyAIItem, CurriculumBook } from '../../types/curriculum';
import { deleteStudyAIItem, saveStudyAIItem } from '../../lib/studyStorage';
import {
  Sparkles, Search, Trash2, Copy, Bookmark, BookmarkCheck,
  Volume2, HelpCircle, FileText, Brain, Languages, Calendar, Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface StudyNotesViewProps {
  book: CurriculumBook;
  items: StudyAIItem[];
  onItemsChange: (items: StudyAIItem[]) => void;
}

export default function StudyNotesView({ book, items, onItemsChange }: StudyNotesViewProps) {
  const { language, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');

  const filteredItems = items.filter(item => {
    if (item.curriculumId !== book.id) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (selectedUnitId !== 'all' && item.unitId !== selectedUnitId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = item.selectedText.toLowerCase().includes(q);
      const matchResponse = item.aiResponse.toLowerCase().includes(q);
      const matchLesson = item.lessonTitle?.toLowerCase().includes(q);
      return matchText || matchResponse || matchLesson;
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    await deleteStudyAIItem(id, user.uid);
    onItemsChange(items.filter(i => i.id !== id));
    toast.success(language === 'en' ? 'Item deleted' : 'تم حذف الملاحظة بنجاح');
  };

  const handleToggleBookmark = async (item: StudyAIItem) => {
    const updated: StudyAIItem = { ...item, isBookmarked: !item.isBookmarked };
    await saveStudyAIItem(updated);
    onItemsChange(items.map(i => i.id === item.id ? updated : i));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'en' ? 'Copied to clipboard' : 'تم النسخ إلى الحافظة');
  };

  const handleTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'en' ? 'en-US' : 'ar-SA';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search in explanations & notes...' : 'البحث في الشروحات والتلاخيص...'}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="all">{language === 'en' ? 'All Units' : 'جميع الوحدات'}</option>
              {book.units.map(u => (
                <option key={u.id} value={u.id}>{u.title}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="all">{language === 'en' ? 'All Types' : 'جميع الأنواع'}</option>
              <option value="explain">{language === 'en' ? 'Explanations' : 'الشروحات'}</option>
              <option value="summary">{language === 'en' ? 'Summaries' : 'التلاخيص'}</option>
              <option value="quiz">{language === 'en' ? 'Quizzes' : 'الأسئلة'}</option>
              <option value="translate">{language === 'en' ? 'Translations' : 'الترجمات'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Sparkles className="w-12 h-12 text-blue-500/40 mx-auto mb-3" />
          <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
            {language === 'en' ? 'No study notes saved yet' : 'لا توجد شروحات أو تلاخيص محفوظة بعد'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {language === 'en'
              ? 'When reading the textbook, select any text and choose Explain or Summarize. It will be saved here automatically!'
              : 'أثناء قراءتك للمنهج في القارئ التفاعلي، حدد أي نص واطلب شرحه أو تلخيصه وسيتم حفظه هنا تلقائياً للرجوع إليه وقت المذاكرة!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                {/* Header tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      item.type === 'explain'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : item.type === 'summary'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        : item.type === 'quiz'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}>
                      {item.type === 'explain' && <HelpCircle className="w-3 h-3" />}
                      {item.type === 'summary' && <FileText className="w-3 h-3" />}
                      {item.type === 'quiz' && <Brain className="w-3 h-3" />}
                      {item.type === 'translate' && <Languages className="w-3 h-3" />}
                      {item.type === 'explain' ? 'شرح ذكي' : item.type === 'summary' ? 'تلخيص' : item.type === 'quiz' ? 'أسئلة تدريب' : 'ترجمة'}
                    </span>

                    {item.lessonTitle && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded truncate max-w-[160px]">
                        {item.lessonTitle} {item.pageNumber ? `(ص ${item.pageNumber})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleBookmark(item)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.isBookmarked
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="المفضلة"
                    >
                      {item.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Selected context quote */}
                <div className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-750 p-2 rounded-xl border-r-2 border-blue-500 line-clamp-2">
                  "{item.selectedText}"
                </div>

                {/* AI generated explanation body */}
                <div className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {item.aiResponse}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/80 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString('ar-YE')}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTTS(item.aiResponse)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                    title="قراءة صوتية"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopy(item.aiResponse)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                    title="نسخ الشرح"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
