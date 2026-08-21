import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { Type } from '@google/genai';
import { getGeminiAI } from '../../lib/gemini';
import { Loader2, Plus, Save, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';


export default function ExamGenerator() {
  const { language } = useStore();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [mcqCount, setMcqCount] = useState(3);
  const [tfCount, setTfCount] = useState(2);
  const [generatedExam, setGeneratedExam] = useState<any>(null);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'classes'), where('teacherId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(fetchedClasses);
      if (fetchedClasses.length > 0) {
        setSelectedClassId(fetchedClasses[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return toast.error(language === 'en' ? 'Please enter a topic' : 'الرجاء إدخال موضوع');
    
    setLoading(true);
    try {
      const prompt = `Generate an exam about "${topic}" with ${mcqCount} Multiple Choice Questions and ${tfCount} True/False questions. Difficulty: ${difficulty}. Language: ${language === 'en' ? 'English' : 'Arabic'}.`;
      
      const response = await getGeminiAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Title of the exam' },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['mcq', 'tf'] },
                    questionText: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Only for MCQ' },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING, description: 'AI explanation for the correct answer' }
                  },
                  required: ['type', 'questionText', 'correctAnswer', 'explanation']
                }
              }
            },
            required: ['title', 'questions']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setGeneratedExam(data);
      toast.success(language === 'en' ? 'Exam generated successfully!' : 'تم إنشاء الامتحان بنجاح!');
    } catch (error) {
      console.error(error);
      toast.error(language === 'en' ? 'Failed to generate exam' : 'فشل إنشاء الامتحان');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!auth.currentUser || !generatedExam) return;
    if (!selectedClassId) {
      return toast.error(language === 'en' ? 'Please select a class first' : 'الرجاء اختيار فصل أولاً');
    }

    setSaving(true);
    try {
      const newExam = {
        id: crypto.randomUUID(),
        title: generatedExam.title,
        creatorId: auth.currentUser.uid,
        classId: selectedClassId,
        questions: generatedExam.questions,
        status: 'published',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'exams'), newExam);
      toast.success(language === 'en' ? 'Exam published successfully!' : 'تم نشر الامتحان بنجاح!');
      setGeneratedExam(null);
      setTopic('');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || (language === 'en' ? 'Failed to save exam' : 'فشل حفظ الامتحان'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'en' ? 'Topic / Lesson' : 'الموضوع / الدرس'}
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={language === 'en' ? 'e.g. Photosynthesis, World War II...' : 'مثال: البناء الضوئي، الحرب العالمية الثانية...'}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'en' ? 'Difficulty' : 'الصعوبة'}
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="easy">{language === 'en' ? 'Easy' : 'سهل'}</option>
            <option value="medium">{language === 'en' ? 'Medium' : 'متوسط'}</option>
            <option value="hard">{language === 'en' ? 'Hard' : 'صعب'}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'MCQ Count' : 'عدد أسئلة الاختيار'}
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={mcqCount}
              onChange={(e) => setMcqCount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'T/F Count' : 'عدد أسئلة صح/خطأ'}
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={tfCount}
              onChange={(e) => setTfCount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {language === 'en' ? 'Generate Exam' : 'إنشاء الامتحان'}
          </button>
        </div>
      </form>

      {generatedExam && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm print:shadow-none print:border-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{generatedExam.title}</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="" disabled>{language === 'en' ? 'Select Class' : 'اختر الفصل'}</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Printer className="w-4 h-4" />
                {language === 'en' ? 'Print' : 'طباعة'}
              </button>
              <button 
                onClick={handleSaveAndPublish}
                disabled={saving || !selectedClassId}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {language === 'en' ? 'Save & Publish' : 'حفظ ونشر'}
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {generatedExam.questions.map((q: any, index: number) => (
              <div key={index} className="space-y-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {index + 1}. {q.questionText}
                </p>
                
                {q.type === 'mcq' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    {q.options.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-gray-400"></div>
                        <span className="text-gray-700 dark:text-gray-300">{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'tf' && (
                  <div className="flex gap-6 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-gray-400"></div>
                      <span className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'True' : 'صح'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-gray-400"></div>
                      <span className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'False' : 'خطأ'}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 print:hidden">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    {language === 'en' ? 'Model Answer & Explanation:' : 'الإجابة النموذجية والشرح:'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <span className="font-bold">{q.correctAnswer}</span> - {q.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
