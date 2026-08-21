import { useState } from 'react';
import { useStore } from '../../lib/store';
import { CurriculumBook, CurriculumUnit, CurriculumLesson } from '../../types/curriculum';
import { saveCustomUnits } from '../../lib/studyStorage';
import { BookOpen, ChevronDown, ChevronRight, Edit3, Plus, Trash2, Check, Sparkles, Brain, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface UnitsLessonsTreeProps {
  book: CurriculumBook;
  onSelectLesson: (unit: CurriculumUnit, lesson: CurriculumLesson, startPage: number) => void;
  onStartQuizForLesson: (unit: CurriculumUnit, lesson: CurriculumLesson) => void;
  onUnitsUpdated?: (units: CurriculumUnit[]) => void;
}

export default function UnitsLessonsTree({
  book,
  onSelectLesson,
  onStartQuizForLesson,
  onUnitsUpdated,
}: UnitsLessonsTreeProps) {
  const { language, user } = useStore();
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    [book.units[0]?.id || '']: true,
  });
  const [isEditingIndex, setIsEditingIndex] = useState(false);
  const [editableUnits, setEditableUnits] = useState<CurriculumUnit[]>(JSON.parse(JSON.stringify(book.units)));

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  const handleSaveCustomIndex = () => {
    saveCustomUnits(book.id, editableUnits);
    if (onUnitsUpdated) {
      onUnitsUpdated(editableUnits);
    }
    setIsEditingIndex(false);
    toast.success(language === 'en' ? 'Curriculum index updated successfully!' : 'تم حفظ وتحديث فهرس المنهج بنجاح!');
  };

  const handleAddUnit = () => {
    const newUnitNumber = editableUnits.length + 1;
    const newUnit: CurriculumUnit = {
      id: 'u-custom-' + Date.now(),
      unitNumber: newUnitNumber,
      title: language === 'en' ? `Unit ${newUnitNumber}: New Unit Title` : `الوحدة ${newUnitNumber}: عنوان الوحدة الجديدة`,
      startPage: 1,
      endPage: 20,
      description: '',
      lessons: [
        {
          id: 'l-custom-' + Date.now(),
          lessonNumber: 1,
          title: language === 'en' ? 'Lesson 1: Introduction' : 'الدرس الأول: مقدمة ومفاهيم أساسية',
          startPage: 1,
          endPage: 10,
          sampleContent: 'محتوى الدرس النموذجي...',
        }
      ]
    };
    setEditableUnits([...editableUnits, newUnit]);
  };

  const handleAddLesson = (unitIndex: number) => {
    const targetUnit = editableUnits[unitIndex];
    const newLessonNumber = targetUnit.lessons.length + 1;
    const newLesson: CurriculumLesson = {
      id: 'l-custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      lessonNumber: newLessonNumber,
      title: language === 'en' ? `Lesson ${newLessonNumber}: New Lesson` : `الدرس ${newLessonNumber}: عنوان الدرس الجديد`,
      startPage: targetUnit.startPage,
      endPage: targetUnit.endPage,
      sampleContent: '',
    };
    const updated = [...editableUnits];
    updated[unitIndex].lessons.push(newLesson);
    setEditableUnits(updated);
  };

  const handleDeleteLesson = (unitIndex: number, lessonIndex: number) => {
    const updated = [...editableUnits];
    updated[unitIndex].lessons.splice(lessonIndex, 1);
    setEditableUnits(updated);
  };

  const handleDeleteUnit = (unitIndex: number) => {
    const updated = [...editableUnits];
    updated.splice(unitIndex, 1);
    setEditableUnits(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header and Index Customizer action */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            {language === 'en' ? 'Units & Lessons Index' : 'فهرس الوحدات والدروس التفصيلي'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'en'
              ? `${book.units.length} Units • ${book.units.reduce((acc, u) => acc + u.lessons.length, 0)} Lessons • ${book.totalPageCount} Pages`
              : `${book.units.length} وحدات • ${book.units.reduce((acc, u) => acc + u.lessons.length, 0)} دروس • ${book.totalPageCount} صفحة`}
          </p>
        </div>

        <button
          onClick={() => {
            if (isEditingIndex) {
              handleSaveCustomIndex();
            } else {
              setEditableUnits(JSON.parse(JSON.stringify(book.units)));
              setIsEditingIndex(true);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            isEditingIndex
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          {isEditingIndex ? (
            <>
              <Check className="w-4 h-4" />
              <span>{language === 'en' ? 'Save Index' : 'حفظ الفهرس'}</span>
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              <span>{language === 'en' ? 'Customize Index' : 'تخصيص الفهرس والصفحات'}</span>
            </>
          )}
        </button>
      </div>

      {/* Editing Mode View */}
      {isEditingIndex ? (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {language === 'en' ? 'Customize and organize units and page ranges:' : 'تخصيص وتقسيم الوحدات والدروس ونطاقات الصفحات:'}
            </span>
            <button
              onClick={handleAddUnit}
              className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Add Unit' : 'إضافة وحدة جديدة'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {editableUnits.map((unit, uIdx) => (
              <div key={unit.id || uIdx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded">
                    #{uIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={unit.title}
                    onChange={(e) => {
                      const copy = [...editableUnits];
                      copy[uIdx].title = e.target.value;
                      setEditableUnits(copy);
                    }}
                    placeholder="عنوان الوحدة"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>ص:</span>
                    <input
                      type="number"
                      value={unit.startPage}
                      onChange={(e) => {
                        const copy = [...editableUnits];
                        copy[uIdx].startPage = parseInt(e.target.value) || 1;
                        setEditableUnits(copy);
                      }}
                      className="w-14 px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-center"
                    />
                    <span>إلى</span>
                    <input
                      type="number"
                      value={unit.endPage}
                      onChange={(e) => {
                        const copy = [...editableUnits];
                        copy[uIdx].endPage = parseInt(e.target.value) || 1;
                        setEditableUnits(copy);
                      }}
                      className="w-14 px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-center"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteUnit(uIdx)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Lessons inside unit */}
                <div className="mr-4 space-y-2 border-r-2 border-blue-200 dark:border-blue-800 pr-3">
                  {unit.lessons.map((lesson, lIdx) => (
                    <div key={lesson.id || lIdx} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">د.{lIdx + 1}</span>
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) => {
                          const copy = [...editableUnits];
                          copy[uIdx].lessons[lIdx].title = e.target.value;
                          setEditableUnits(copy);
                        }}
                        placeholder="عنوان الدرس"
                        className="flex-1 px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                      />
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <span>ص:</span>
                        <input
                          type="number"
                          value={lesson.startPage}
                          onChange={(e) => {
                            const copy = [...editableUnits];
                            copy[uIdx].lessons[lIdx].startPage = parseInt(e.target.value) || 1;
                            setEditableUnits(copy);
                          }}
                          className="w-12 px-1 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-600 text-center"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          value={lesson.endPage}
                          onChange={(e) => {
                            const copy = [...editableUnits];
                            copy[uIdx].lessons[lIdx].endPage = parseInt(e.target.value) || 1;
                            setEditableUnits(copy);
                          }}
                          className="w-12 px-1 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-600 text-center"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteLesson(uIdx, lIdx)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddLesson(uIdx)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'en' ? 'Add lesson to this unit' : 'إضافة درس لهذه الوحدة'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditingIndex(false)}
              className="px-3 py-1.5 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {language === 'en' ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              onClick={handleSaveCustomIndex}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow"
            >
              {language === 'en' ? 'Save Index' : 'حفظ الفهرس المخصص'}
            </button>
          </div>
        </div>
      ) : (
        /* Regular Interactive Syllabus Tree View */
        <div className="space-y-3">
          {book.units.map((unit) => {
            const isExpanded = expandedUnits[unit.id] ?? false;
            return (
              <div
                key={unit.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700"
              >
                {/* Unit Header */}
                <div
                  onClick={() => toggleUnit(unit.id)}
                  className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80 hover:bg-blue-50/50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {unit.unitNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                        {unit.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {language === 'en'
                          ? `Pages ${unit.startPage} - ${unit.endPage} (${unit.endPage - unit.startPage + 1} pages) • ${unit.lessons.length} lessons`
                          : `الصفحات من ${unit.startPage} إلى ${unit.endPage} (${unit.endPage - unit.startPage + 1} صفحة) • ${unit.lessons.length} دروس`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                      {language === 'en' ? `${unit.lessons.length} Lessons` : `${unit.lessons.length} دروس`}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Lessons list */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                    {unit.lessons.map((lesson) => {
                      const isExcluded = lesson.contentStatus === 'excluded';
                      const isRequired = lesson.contentStatus === 'required';
                      return (
                      <div
                        key={lesson.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isExcluded ? 'opacity-50 bg-gray-50/70 dark:bg-slate-900/40' : 'hover:bg-blue-50/30 dark:hover:bg-gray-750'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl shrink-0 mt-0.5">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className={`font-semibold text-xs sm:text-sm ${isExcluded ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                {lesson.title}
                              </h5>
                              {isExcluded && <span className="text-[10px] rounded-full bg-gray-200 px-2 py-0.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">{language === 'en' ? 'Excluded' : 'مستبعد من الخطة'}</span>}
                              {isRequired && <span className="text-[10px] rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{language === 'en' ? 'Required' : 'مقرر إلزامي'}</span>}
                            </div>
                            {lesson.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                {lesson.description}
                              </p>
                            )}
                            {lesson.contentOverrideNote && <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">{lesson.contentOverrideNote}</p>}
                            <span className="inline-block mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                              {language === 'en'
                                ? `Pages ${lesson.startPage} - ${lesson.endPage}`
                                : `الصفحة ${lesson.startPage} إلى ${lesson.endPage}`}
                            </span>
                          </div>
                        </div>

                        {/* Actions for this lesson */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => onStartQuizForLesson(unit, lesson)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800/50 transition-all shadow-xs"
                            title={language === 'en' ? 'Quiz me on this lesson' : 'اختبرني في هذا الدرس بالذكاء الاصطناعي'}
                          >
                            <Brain className="w-3.5 h-3.5 text-purple-600" />
                            <span>{language === 'en' ? 'Lesson Quiz' : 'اختبار ذكي'}</span>
                          </button>

                          <button
                            onClick={() => onSelectLesson(unit, lesson, lesson.startPage)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm hover:shadow"
                          >
                            <span>{language === 'en' ? 'Read Lesson' : 'مذاكرة الدرس'}</span>
                            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
