import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useStore } from '../../lib/store';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function PwaInstallPrompt() {
  const { language } = useStore();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone || localStorage.getItem('edusmart-pwa-dismissed') === '1') return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
    if (isIos && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem('edusmart-pwa-dismissed', '1');
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setInstallEvent(null);
  };

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-2xl dark:border-teal-900 dark:bg-gray-900" role="dialog" aria-label={language === 'ar' ? 'تثبيت EduSmart' : 'Install EduSmart'}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white"><Download className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <h2 className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'ثبّت EduSmart على جهازك' : 'Install EduSmart'}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{iosHint ? (language === 'ar' ? 'اضغط زر المشاركة في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».' : 'Tap Share in Safari, then choose “Add to Home Screen”.') : (language === 'ar' ? 'وصول أسرع وتجربة أفضل حتى مع اتصال إنترنت ضعيف.' : 'Get faster access and a better experience on weak connections.')}</p>
        {!iosHint && installEvent ? <button type="button" onClick={() => void install()} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">{language === 'ar' ? 'تثبيت الآن' : 'Install now'}</button> : null}
      </div>
      <button type="button" onClick={dismiss} aria-label={language === 'ar' ? 'إغلاق' : 'Dismiss'} className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
    </aside>
  );
}
