import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, ChevronDown, FileSearch, Loader2, RefreshCw, Search } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useStore } from '../../../lib/store';
import { db } from '../../../lib/firebase';

type AuditEntry = { id: string; action?: string; collection?: string; entityId?: string; actorId?: string; before?: unknown; after?: unknown; createdAt?: string };

function pretty(value: unknown) { return JSON.stringify(value ?? null, null, 2); }

export default function AuditLogs() {
  const { language } = useStore();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [expanded, setExpanded] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const snapshot = await getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(250)));
      setEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AuditEntry)));
    } catch (loadError) {
      console.error('Unable to load audit logs:', loadError);
      setError(language === 'ar' ? 'تعذر تحميل سجل التدقيق. قد تحتاج إلى إنشاء فهرس createdAt أو مراجعة الصلاحية.' : 'Unable to load audit logs. Check the createdAt index and admin permission.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => entries.filter((entry) => (action === 'all' || entry.action === action) && `${entry.collection} ${entry.entityId} ${entry.actorId}`.toLowerCase().includes(search.trim().toLowerCase())), [entries, search, action]);
  return <div className="mx-auto max-w-7xl space-y-6"><header className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:flex-row sm:items-end sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Governance · Audit</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{language === 'ar' ? 'سجل التدقيق الإداري' : 'Administrative audit log'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{language === 'ar' ? 'مراجعة العمليات الحساسة مع المسؤول والبيانات السابقة واللاحقة عندما تكون متاحة.' : 'Review sensitive operations with the actor and before/after payloads when available.'}</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15"><RefreshCw className="h-4 w-4" />{language === 'ar' ? 'تحديث' : 'Refresh'}</button></header>{error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] dark:border-slate-700 dark:bg-slate-800"><div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field ps-10" placeholder={language === 'ar' ? 'ابحث بالمجموعة أو المعرف أو المسؤول' : 'Search collection, entity, or actor'} /></div><select value={action} onChange={(event) => setAction(event.target.value)} className="input-field"><option value="all">{language === 'ar' ? 'كل العمليات' : 'All actions'}</option><option value="create">{language === 'ar' ? 'إنشاء' : 'Create'}</option><option value="update">{language === 'ar' ? 'تعديل' : 'Update'}</option><option value="approve">{language === 'ar' ? 'اعتماد' : 'Approve'}</option><option value="reject">{language === 'ar' ? 'رفض' : 'Reject'}</option></select></section>{loading ? <div className="flex h-56 items-center justify-center text-slate-500"><Loader2 className="me-2 h-5 w-5 animate-spin" />{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div> : !filtered.length ? <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center"><FileSearch className="mx-auto h-10 w-10 text-slate-400" /><p className="mt-3 font-bold">{language === 'ar' ? 'لا توجد سجلات مطابقة' : 'No matching audit entries'}</p></div> : <div className="space-y-3">{filtered.map((entry) => <article key={entry.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><button type="button" onClick={() => setExpanded((current) => current === entry.id ? '' : entry.id)} className="flex w-full items-start justify-between gap-4 text-start"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30"><Activity className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900 dark:text-white">{entry.collection || '—'}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{entry.action || '—'}</span></div><p className="mt-1 text-xs text-slate-500">ID: {entry.entityId || '—'} · actor: {entry.actorId || '—'}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{entry.createdAt ? new Date(entry.createdAt).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US') : '—'}</p></div></div><ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${expanded === entry.id ? 'rotate-180' : ''}`} /></button>{expanded === entry.id && <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-700 lg:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{language === 'ar' ? 'قبل' : 'Before'}</p><pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-200">{pretty(entry.before)}</pre></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{language === 'ar' ? 'بعد' : 'After'}</p><pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-200">{pretty(entry.after)}</pre></div></div>}</article>)}</div>}</div>;
}
