import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { BookOpen, Plus, Loader2, Trash2, FileText } from 'lucide-react';
import { extractTextFromPDF } from '../../lib/pdfUtils';
import { toast } from 'sonner';
import { GRADES } from '../../lib/constants';

interface Book {
  id: string;
  title: string;
  grade: string;
  subject: string;
  uploaderId: string;
  createdAt: string;
}

export default function LibraryManagement() {
  const { language } = useStore();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    grade: GRADES[0],
    subject: '',
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'books'), where('uploaderId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const fetchedBooks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(fetchedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error(language === 'en' ? 'Failed to load books' : 'فشل تحميل الكتب');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !auth.currentUser) return;

    setUploading(true);
    try {
      const textContent = await extractTextFromPDF(file);
      
      const newBook = {
        id: crypto.randomUUID(),
        title: formData.title,
        grade: formData.grade,
        subject: formData.subject,
        uploaderId: auth.currentUser.uid,
        content: textContent,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'books'), newBook);
      toast.success(language === 'en' ? 'Book uploaded successfully' : 'تم رفع الكتاب بنجاح');
      setShowModal(false);
      setFormData({ title: '', grade: GRADES[0], subject: '' });
      setFile(null);
      fetchBooks();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || (language === 'en' ? 'Failed to upload book' : 'فشل رفع الكتاب'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this book?' : 'هل أنت متأكد من حذف هذا الكتاب؟')) return;
    
    try {
      await deleteDoc(doc(db, 'books', id));
      toast.success(language === 'en' ? 'Book deleted' : 'تم حذف الكتاب');
      fetchBooks();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(language === 'en' ? 'Failed to delete book' : 'فشل حذف الكتاب');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {language === 'en' ? 'School Library' : 'مكتبة المدرسة'}
        </h2>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {language === 'en' ? 'Upload Book' : 'رفع كتاب'}
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {language === 'en' ? 'No books uploaded yet' : 'لم يتم رفع أي كتب بعد'}
          </h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'Upload PDF textbooks to make them available for teachers and students.' : 'قم برفع الكتب المدرسية بصيغة PDF لجعلها متاحة للمعلمين والطلاب.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <div key={book.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => handleDelete(book.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{book.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.subject}</p>
              <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{book.grade}</span>
                <span>{new Date(book.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'en' ? 'Upload New Book' : 'رفع كتاب جديد'}
            </h3>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Book Title' : 'عنوان الكتاب'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Subject' : 'المادة'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Grade/Level' : 'الصف/المستوى'}
                </label>
                <select
                  required
                  value={formData.grade}
                  onChange={e => setFormData({...formData, grade: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'PDF File' : 'ملف PDF'}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {language === 'en' ? 'Upload' : 'رفع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
