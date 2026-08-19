import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../lib/store';
import AIContextMenu from './AIContextMenu';
import { BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface PDFReaderProps {
  book?: {
    title: string;
    subject: string;
    content: string;
  };
}

export default function PDFReader({ book }: PDFReaderProps) {
  const { language } = useStore();
  const [selectedText, setSelectedText] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(100);
  const contentRef = useRef<HTMLDivElement>(null);

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
            x: rect.left + window.scrollX + (rect.width / 2),
            y: rect.bottom + window.scrollY,
          });
        }
      } else {
        // Only close if we didn't click inside the menu
        // The menu itself handles outside clicks
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{book?.title || 'Untitled'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{book?.subject || 'Unknown Subject'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium w-12 text-center text-gray-700 dark:text-gray-300">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-100 dark:bg-gray-900">
        <div 
          ref={contentRef}
          className="bg-white dark:bg-gray-800 shadow-lg p-12 max-w-3xl w-full min-h-full rounded-sm"
          style={{ fontSize: `${zoom}%` }}
        >
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{book?.title}</h1>
            
            <div className="whitespace-pre-wrap text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed selection:bg-blue-200 dark:selection:bg-blue-900/50">
              {book?.content || 'No content available.'}
            </div>

            <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 text-center">
                {language === 'en' ? 'Tip: Select any text to translate, explain, or generate a quiz!' : 'تلميح: حدد أي نص للترجمة، الشرح، أو إنشاء اختبار قصير!'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center gap-4">
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page 1 of 1</span>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* AI Context Menu */}
      {menuPosition && (
        <AIContextMenu
          selectedText={selectedText}
          position={menuPosition}
          onClose={handleCloseMenu}
        />
      )}
    </div>
  );
}
