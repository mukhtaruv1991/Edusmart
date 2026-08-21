import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../../lib/store';
import { BookOpen, Plus, Loader2, Trash2, FileText, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { YEMEN_GRADE_OPTIONS, YemenGradeKey } from '../../lib/gradeCatalog';
import {
  deleteCurriculumBook,
  listSchoolCurriculumBooks,
  publishCurriculumBook,
} from '../../lib/curriculumPublisher';
import { CurriculumBook } from '../../types/curriculum';

export default function LibraryManagement() {
  const { language, user } = useStore();
  const [books, setBooks] = useState<CurriculumBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    gradeKey: YEMEN_GRADE_OPTIONS[0].key as YemenGradeKey,
    part: 'combined' as 'part_1' | 'part_2' | 'combined',
  });

  const schoolId = user?.schoolId;
  const schoolName = user?.school;

  const fetchBooks = async () => {
    if (!schoolId && !schoolName) {
      setBooks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setBooks(await listSchoolCurriculumBooks(schoolId, schoolName));
    } catch (error) {
      console.error('Error fetching curriculum books:', error);
      toast.error(language === 'en' ? 'Failed to load curriculum books' : 'فشل تحميل كتب المنهج');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [schoolId, schoolName]);

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!pdfFile || !manifestFile || !user?.uid) return;
    if (!user.schoolId && !user.school) {
      toast.error('يجب ربط حساب المدرسة بمدرسة قبل نشر المنهج');
      return;
    }

    try {
      setUploading(true);
      setProgress(10);
      await publishCurriculumBook({
        title: formData.title,
        subject: formData.subject,
        gradeKey: formData.gradeKey,
        part: formData.part,
        pdfFile,
        manifestFile,
        schoolId: user.schoolId,
        schoolName: user.school,
        createdBy: user.uid,
        onProgress: setProgress,
      });
      toast.success('تم رفع PDF وJSON وتسجيل المنهج للطلاب بنجاح');
      setShowModal(false);
      setPdfFile(null);
      setManifestFile(null);
      setFormData({
        title: '',
        subject: '',
        gradeKey: YEMEN_GRADE_OPTIONS[0].key,
        part: 'combined',
      });
      await fetchBooks();
    } catch (error: any) {
      console.error('Curriculum upload error:', error);
      toast.error(error.message || 'فشل رفع المنهج');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (book: CurriculumBook) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل هذا المنهج؟')) return;
    try {
      await deleteCurriculumBook(book.id);
      toast.success('تم حذف سجل المنهج');
      await fetchBooks();
    } catch (error) {
      console.error('Curriculum delete error:', error);
      toast.error('فشل حذف المنهج');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {language === 'en' ? 'School Curriculum Publisher' : 'ناشر مناهج المدرسة'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PDF للعرض وJSON للصفحات؛ لا يتم حشر الملفات داخل حزمة التطبيق أو Firestore.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {language === 'en' ? 'Publish Book' : 'نشر كتاب'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">لم يتم نشر كتب لهذه المدرسة بعد</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">ارفع ملف PDF وملف JSON المعالج للصفحة نفسها.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <div key={book.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><FileText className="w-6 h-6" /></div>
                <button onClick={() => handleDelete(book)} className="text-gray-400 hover:text-red-500 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{book.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.subject} • {book.part || 'combined'}</p>
              <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{book.grade}</span><span>{book.totalPageCount} صفحة</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">نشر كتاب منهجي</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <input required type="text" placeholder="عنوان الكتاب" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input required type="text" placeholder="اسم المادة" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <select required value={formData.gradeKey} onChange={(e) => setFormData({ ...formData, gradeKey: e.target.value as YemenGradeKey })} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {YEMEN_GRADE_OPTIONS.map((grade) => <option key={grade.key} value={grade.key}>{grade.labelAr}</option>)}
              </select>
              <select required value={formData.part} onChange={(e) => setFormData({ ...formData, part: e.target.value as 'part_1' | 'part_2' | 'combined' })} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="part_1">الجزء الأول</option><option value="part_2">الجزء الثاني</option><option value="combined">كتاب موحد</option>
              </select>
              <label className="block text-sm text-gray-700 dark:text-gray-300">ملف PDF الأصلي<input required type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="mt-1 w-full" /></label>
              <label className="block text-sm text-gray-700 dark:text-gray-300">ملف JSON المعالج صفحة بصفحة<input required type="file" accept="application/json,.json" onChange={(e) => setManifestFile(e.target.files?.[0] || null)} className="mt-1 w-full" /></label>
              {uploading && <div className="text-xs text-blue-700">جاري الرفع والفهرسة: {progress}%</div>}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" disabled={uploading} onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 rounded-lg">إلغاء</button>
                <button type="submit" disabled={uploading || !pdfFile || !manifestFile} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} رفع ونشر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
