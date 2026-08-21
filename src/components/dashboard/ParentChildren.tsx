import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Users, Plus, Loader2, UserMinus, Search, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiAI } from '../../lib/gemini';


interface Child {
  id: string;
  name: string;
  email: string;
  grade: string;
  school: string;
}

export default function ParentChildren() {
  const { language } = useStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childStats, setChildStats] = useState<any>(null);
  const [generatingRadar, setGeneratingRadar] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'users'), where('parentId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const fetchedChildren = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Child[];
      setChildren(fetchedChildren);
      if (fetchedChildren.length > 0) {
        handleSelectChild(fetchedChildren[0]);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim() || !auth.currentUser) return;

    setAdding(true);
    try {
      // Find student by email
      const q = query(collection(db, 'users'), where('email', '==', studentEmail.trim()), where('role', '==', 'student'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error(language === 'en' ? 'Student not found' : 'الطالب غير موجود');
        setAdding(false);
        return;
      }

      const studentDoc = snapshot.docs[0];
      
      // Update student document with parentId
      await updateDoc(doc(db, 'users', studentDoc.id), {
        parentId: auth.currentUser.uid
      });

      toast.success(language === 'en' ? 'Child linked successfully' : 'تم ربط الطالب بنجاح');
      setShowAddModal(false);
      setStudentEmail('');
      fetchChildren();
    } catch (error: any) {
      console.error('Add child error:', error);
      toast.error(error.message || (language === 'en' ? 'Failed to link child' : 'فشل ربط الطالب'));
    } finally {
      setAdding(false);
    }
  };

  const handleSelectChild = async (child: Child) => {
    setSelectedChild(child);
    setGeneratingRadar(true);
    try {
      // Fetch child's submissions
      const submissionsQ = query(collection(db, 'submissions'), where('studentId', '==', child.id));
      const submissionsSnapshot = await getDocs(submissionsQ);
      const submissions = submissionsSnapshot.docs.map(doc => doc.data());

      if (submissions.length === 0) {
        setChildStats({
          strengths: language === 'en' ? 'Not enough data yet.' : 'لا توجد بيانات كافية بعد.',
          weaknesses: language === 'en' ? 'Not enough data yet.' : 'لا توجد بيانات كافية بعد.',
          recommendation: language === 'en' ? 'Encourage the student to take more exams.' : 'شجع الطالب على إجراء المزيد من الامتحانات.'
        });
        setGeneratingRadar(false);
        return;
      }

      // Calculate average score
      const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
      const averageScore = Math.round(totalScore / submissions.length);

      // Generate AI Radar
      const prompt = `
        Analyze the following student performance data and provide a brief radar report for their parent.
        Student Grade: ${child.grade}
        Average Score: ${averageScore}%
        Exams Taken: ${submissions.length}
        
        Provide the response in ${language === 'en' ? 'English' : 'Arabic'} as a JSON object with the following keys:
        - strengths: A short sentence describing what they are doing well.
        - weaknesses: A short sentence describing areas for improvement.
        - recommendation: A short actionable tip for the parent.
      `;

      const response = await getGeminiAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const radarData = JSON.parse(response.text || '{}');
      setChildStats({
        averageScore,
        examsTaken: submissions.length,
        ...radarData
      });

    } catch (error) {
      console.error('Error generating radar:', error);
      setChildStats({
        strengths: language === 'en' ? 'Error generating insights.' : 'خطأ في توليد الرؤى.',
        weaknesses: language === 'en' ? 'Error generating insights.' : 'خطأ في توليد الرؤى.',
        recommendation: language === 'en' ? 'Please try again later.' : 'الرجاء المحاولة مرة أخرى لاحقاً.'
      });
    } finally {
      setGeneratingRadar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          {language === 'en' ? 'My Children' : 'أبنائي'}
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {language === 'en' ? 'Link Child' : 'ربط طالب'}
        </button>
      </div>

      {children.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {language === 'en' ? 'No children linked yet' : 'لم يتم ربط أي أبناء بعد'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'Link your child\'s account using their email address.' : 'قم بربط حساب ابنك باستخدام عنوان بريده الإلكتروني.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Children List */}
          <div className="lg:col-span-1 space-y-4">
            {children.map(child => (
              <div 
                key={child.id}
                onClick={() => handleSelectChild(child)}
                className={`p-4 border rounded-xl cursor-pointer transition-colors ${selectedChild?.id === child.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'}`}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">{child.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{child.grade} • {child.school}</p>
              </div>
            ))}
          </div>

          {/* Child Details & Radar */}
          <div className="lg:col-span-2">
            {selectedChild && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  {language === 'en' ? 'AI Student Radar for' : 'رادار الطالب بالذكاء الاصطناعي لـ'} {selectedChild.name}
                </h2>
                
                {generatingRadar ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {language === 'en' ? 'Analyzing performance data...' : 'جاري تحليل بيانات الأداء...'}
                    </p>
                  </div>
                ) : childStats ? (
                  <div className="space-y-6">
                    {childStats.averageScore !== undefined && (
                      <div className="flex gap-6 mb-8">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg flex-1 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Average Score' : 'متوسط الدرجات'}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{childStats.averageScore}%</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg flex-1 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Exams Taken' : 'الامتحانات المنجزة'}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{childStats.examsTaken}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-medium text-green-800 dark:text-green-300">
                            {language === 'en' ? 'Strengths' : 'نقاط القوة'}
                          </h3>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {childStats.strengths}
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          <h3 className="font-medium text-orange-800 dark:text-orange-300">
                            {language === 'en' ? 'Areas for Improvement' : 'مجالات التحسين'}
                          </h3>
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          {childStats.weaknesses}
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="font-medium text-blue-800 dark:text-blue-300">
                            {language === 'en' ? 'AI Recommendation' : 'توصية الذكاء الاصطناعي'}
                          </h3>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          {childStats.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'en' ? 'Link Child Account' : 'ربط حساب طالب'}
              </h3>
            </div>
            
            <form onSubmit={handleAddChild} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Student Email Address' : 'البريد الإلكتروني للطالب'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="student@example.com"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {language === 'en' ? 'The student must already have an account registered with this email.' : 'يجب أن يكون لدى الطالب حساب مسجل مسبقاً بهذا البريد الإلكتروني.'}
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={adding || !studentEmail}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                  {language === 'en' ? 'Link Account' : 'ربط الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
