import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { changeOwnerPassword, ownerAuthErrorMessage, isOwnerEmail } from '../../lib/ownerAuth';
import { Settings as SettingsIcon, Save, User, Bell, Shield, Globe, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, language } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emailAlerts: true,
    smsAlerts: false,
    language: language,
    theme: 'light',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.uid) return;
      
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().settings) {
          setSettings({ ...settings, ...docSnap.data().settings });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        settings
      });
      toast.success(language === 'en' ? 'Settings saved successfully' : 'تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(language === 'en' ? 'Failed to save settings' : 'فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleOwnerPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth.currentUser || !isOwnerEmail(auth.currentUser.email)) return;
    if (nextPassword.length < 8) {
      toast.error(language === 'en' ? 'Use at least 8 characters.' : 'استخدم 8 أحرف على الأقل.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      toast.error(language === 'en' ? 'Passwords do not match.' : 'كلمتا المرور غير متطابقتين.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changeOwnerPassword(auth.currentUser, currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      toast.success(language === 'en' ? 'Owner password changed.' : 'تم تغيير كلمة مرور المالك.');
    } catch (error) {
      toast.error(ownerAuthErrorMessage(error, language));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{language === 'en' ? 'Loading settings...' : 'جاري تحميل الإعدادات...'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Settings' : 'الإعدادات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage your account preferences and settings' : 'إدارة تفضيلات وإعدادات حسابك'}
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (language === 'en' ? 'Save Changes' : 'حفظ التغييرات')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium text-left">
            <Bell className="w-5 h-5" />
            {language === 'en' ? 'Notifications' : 'الإشعارات'}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-left transition-colors">
            <Globe className="w-5 h-5" />
            {language === 'en' ? 'Preferences' : 'التفضيلات'}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-left transition-colors">
            <Shield className="w-5 h-5" />
            {language === 'en' ? 'Security' : 'الأمان'}
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
              {language === 'en' ? 'Notification Preferences' : 'تفضيلات الإشعارات'}
            </h3>
            
            <div className="space-y-6">
              {isOwnerEmail(user?.email) && (
                <form onSubmit={handleOwnerPasswordChange} className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="mb-4 flex items-start gap-3">
                    <KeyRound className="mt-1 h-5 w-5 text-amber-700" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{language === 'en' ? 'Owner account security' : 'أمان حساب المالك'}</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{language === 'en' ? 'Change the Firebase password. It is never stored in the application.' : 'غيّر كلمة مرور Firebase؛ لا يتم تخزينها داخل التطبيق.'}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input type="password" required minLength={6} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder={language === 'en' ? 'Current password' : 'كلمة المرور الحالية'} autoComplete="current-password" className="input-field" />
                    <input type="password" required minLength={8} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} placeholder={language === 'en' ? 'New password (8+)' : 'كلمة المرور الجديدة (8+)'} autoComplete="new-password" className="input-field" />
                    <input type="password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={language === 'en' ? 'Confirm new password' : 'تأكيد كلمة المرور الجديدة'} autoComplete="new-password" className="input-field" />
                  </div>
                  <button type="submit" disabled={passwordSaving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                    <KeyRound className="h-4 w-4" />{passwordSaving ? (language === 'en' ? 'Updating...' : 'جاري التحديث...') : (language === 'en' ? 'Change password' : 'تغيير كلمة المرور')}
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{language === 'en' ? 'Push Notifications' : 'إشعارات الدفع'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Receive notifications in your browser' : 'تلقي الإشعارات في متصفحك'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{language === 'en' ? 'Email Alerts' : 'تنبيهات البريد الإلكتروني'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Receive important updates via email' : 'تلقي التحديثات الهامة عبر البريد الإلكتروني'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.emailAlerts}
                    onChange={(e) => handleChange('emailAlerts', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{language === 'en' ? 'SMS Alerts' : 'تنبيهات الرسائل القصيرة'}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Receive urgent alerts via SMS' : 'تلقي التنبيهات العاجلة عبر الرسائل القصيرة'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.smsAlerts}
                    onChange={(e) => handleChange('smsAlerts', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
