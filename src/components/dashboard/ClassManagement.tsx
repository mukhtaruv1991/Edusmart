import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Users, Plus, Trash2, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Class {
  id: string;
  name: string;
  teacherId: string;
  students: string[];
  createdAt: string;
}

interface Student {
  uid: string;
  name: string;
  email: string;
}

export default function ClassManagement() {
  const { language } = useStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [className, setClassName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents(selectedClass.students);
    } else {
      setClassStudents([]);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'classes'), where('teacherId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(fetchedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(language === 'en' ? 'Failed to load classes' : 'فشل تحميل الفصول');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) {
      setClassStudents([]);
      return;
    }
    try {
      // Note: Firestore 'in' queries are limited to 10 items. For a real app, 
      // we'd chunk this or fetch individually if > 10.
      const chunks = [];
      for (let i = 0; i < studentIds.length; i += 10) {
        chunks.push(studentIds.slice(i, i + 10));
      }
      
      let allStudents: Student[] = [];
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snapshot = await getDocs(q);
        const students = snapshot.docs.map(doc => ({
          uid: doc.data().uid,
          name: doc.data().name,
          email: doc.data().email
        }));
        allStudents = [...allStudents, ...students];
      }
      setClassStudents(allStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !className.trim()) return;

    setCreating(true);
    try {
      const newClass = {
        id: crypto.randomUUID(),
        name: className,
        teacherId: auth.currentUser.uid,
        students: [],
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'classes'), newClass);
      toast.success(language === 'en' ? 'Class created successfully' : 'تم إنشاء الفصل بنجاح');
      setShowModal(false);
      setClassName('');
      fetchClasses();
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.message || (language === 'en' ? 'Failed to create class' : 'فشل إنشاء الفصل'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this class?' : 'هل أنت متأكد من حذف هذا الفصل؟')) return;
    
    try {
      await deleteDoc(doc(db, 'classes', id));
      toast.success(language === 'en' ? 'Class deleted' : 'تم حذف الفصل');
      if (selectedClass?.id === id) setSelectedClass(null);
      fetchClasses();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(language === 'en' ? 'Failed to delete class' : 'فشل حذف الفصل');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !studentEmail.trim()) return;

    setAddingStudent(true);
    try {
      // Find student by email
      const q = query(collection(db, 'users'), where('email', '==', studentEmail.trim()), where('role', '==', 'student'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error(language === 'en' ? 'Student not found' : 'الطالب غير موجود');
        setAddingStudent(false);
        return;
      }

      const studentId = snapshot.docs[0].data().uid;
      
      if (selectedClass.students.includes(studentId)) {
        toast.error(language === 'en' ? 'Student already in class' : 'الطالب موجود بالفعل في الفصل');
        setAddingStudent(false);
        return;
      }

      // Add to class
      await updateDoc(doc(db, 'classes', selectedClass.id), {
        students: arrayUnion(studentId)
      });
      
      toast.success(language === 'en' ? 'Student added' : 'تمت إضافة الطالب');
      setStudentEmail('');
      
      // Update local state
      const updatedClass = { ...selectedClass, students: [...selectedClass.students, studentId] };
      setSelectedClass(updatedClass);
      setClasses(classes.map(c => c.id === updatedClass.id ? updatedClass : c));
      
    } catch (error: any) {
      console.error('Add student error:', error);
      toast.error(error.message || (language === 'en' ? 'Failed to add student' : 'فشل إضافة الطالب'));
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    if (!confirm(language === 'en' ? 'Remove this student?' : 'إزالة هذا الطالب؟')) return;

    try {
      await updateDoc(doc(db, 'classes', selectedClass.id), {
        students: arrayRemove(studentId)
      });
      
      toast.success(language === 'en' ? 'Student removed' : 'تمت إزالة الطالب');
      
      // Update local state
      const updatedClass = { 
        ...selectedClass, 
        students: selectedClass.students.filter(id => id !== studentId) 
      };
      setSelectedClass(updatedClass);
      setClasses(classes.map(c => c.id === updatedClass.id ? updatedClass : c));
    } catch (error) {
      console.error('Remove student error:', error);
      toast.error(language === 'en' ? 'Failed to remove student' : 'فشل إزالة الطالب');
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Classes List */}
      <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'en' ? 'My Classes' : 'فصولي'}
          </h2>
          <button 
            onClick={() => setShowModal(true)}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'No classes yet' : 'لا توجد فصول بعد'}
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map(c => (
              <div 
                key={c.id} 
                onClick={() => setSelectedClass(c)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors flex justify-between items-center ${
                  selectedClass?.id === c.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{c.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {c.students.length} {language === 'en' ? 'Students' : 'طلاب'}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleDeleteClass(c.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class Details */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        {selectedClass ? (
          <>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedClass.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'en' ? 'Manage students in this class' : 'إدارة الطلاب في هذا الفصل'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddStudent} className="flex gap-3 mb-8">
              <input
                type="email"
                required
                placeholder={language === 'en' ? 'Student Email' : 'البريد الإلكتروني للطالب'}
                value={studentEmail}
                onChange={e => setStudentEmail(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={addingStudent || !studentEmail.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {language === 'en' ? 'Add' : 'إضافة'}
              </button>
            </form>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {language === 'en' ? 'Enrolled Students' : 'الطلاب المسجلين'} ({classStudents.length})
              </h3>
              
              {classStudents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'No students enrolled yet' : 'لم يتم تسجيل أي طلاب بعد'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classStudents.map(student => (
                    <div key={student.uid} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveStudent(student.uid)}
                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        {language === 'en' ? 'Remove' : 'إزالة'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {language === 'en' ? 'Select a class' : 'اختر فصلاً'}
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm">
              {language === 'en' ? 'Choose a class from the sidebar to view and manage its students.' : 'اختر فصلاً من القائمة الجانبية لعرض وإدارة طلابه.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'en' ? 'Create New Class' : 'إنشاء فصل جديد'}
            </h3>
            
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Class Name' : 'اسم الفصل'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'en' ? 'e.g. Grade 10 Math' : 'مثال: رياضيات الصف العاشر'}
                  value={className}
                  onChange={e => setClassName(e.target.value)}
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
                  disabled={creating || !className.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {language === 'en' ? 'Create' : 'إنشاء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
