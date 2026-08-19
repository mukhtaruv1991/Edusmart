import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { User, Mail, Phone, MapPin, Book, GraduationCap, Building2, Calendar, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentProfile() {
  const { user, language } = useStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit state
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(data);
          setPhone(data.phone || '');
          setAddress(data.address || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error(language === 'en' ? 'Failed to load profile' : 'فشل في تحميل الملف الشخصي');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, language]);

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone,
        address
      });
      
      setProfileData({ ...profileData, phone, address });
      setIsEditing(false);
      toast.success(language === 'en' ? 'Profile updated successfully' : 'تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'en' ? 'Failed to update profile' : 'فشل في تحديث الملف الشخصي');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{language === 'en' ? 'Loading profile...' : 'جاري تحميل الملف الشخصي...'}</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <User className="w-12 h-12 mb-4 opacity-50" />
        <p>{language === 'en' ? 'Profile not found.' : 'لم يتم العثور على الملف الشخصي.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'My Profile' : 'ملفي الشخصي'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'View and manage your personal information' : 'عرض وإدارة معلوماتك الشخصية'}
          </p>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>{language === 'en' ? 'Edit Profile' : 'تعديل الملف'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsEditing(false);
                setPhone(profileData.phone || '');
                setAddress(profileData.address || '');
              }}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>{language === 'en' ? 'Cancel' : 'إلغاء'}</span>
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{language === 'en' ? 'Save Changes' : 'حفظ التغييرات'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        <div className="px-6 sm:px-10 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
              <div className="w-full h-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold">
                {profileData.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="mb-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                profileData.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {profileData.status === 'active' ? (language === 'en' ? 'Active' : 'نشط') : (language === 'en' ? 'Pending' : 'قيد الانتظار')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  {language === 'en' ? 'Personal Information' : 'المعلومات الشخصية'}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Full Name' : 'الاسم الكامل'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profileData.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Email Address' : 'البريد الإلكتروني'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profileData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="w-full">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Phone Number' : 'رقم الهاتف'}</p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1 w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white">{profileData.phone || '-'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="w-full">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Address' : 'العنوان'}</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="mt-1 w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-white">{profileData.address || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  {language === 'en' ? 'Academic Information' : 'المعلومات الأكاديمية'}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'School' : 'المدرسة'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profileData.school || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Grade/Level' : 'المرحلة/المستوى'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profileData.grade || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Book className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'System' : 'النظام'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profileData.system || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Joined Date' : 'تاريخ الانضمام'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {profileData.createdAt?.toDate().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA') || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
