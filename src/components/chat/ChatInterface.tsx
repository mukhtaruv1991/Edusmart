import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { db, storage } from '../../lib/firebase';
import { useStore } from '../../lib/store';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt?: { toDate?: () => Date } | Date | string | null;
  read?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  deletedFor?: string[];
  deletedAt?: { toDate?: () => Date } | Date | string | null;
}

interface ChatUser {
  uid: string;
  name: string;
  email?: string;
  role?: string;
  photoURL?: string;
}

const roleLabels: Record<string, { ar: string; en: string }> = {
  student: { ar: 'طالب', en: 'Student' },
  teacher: { ar: 'معلم', en: 'Teacher' },
  parent: { ar: 'ولي أمر', en: 'Parent' },
  principal: { ar: 'مدير المدرسة', en: 'Principal' },
  admin: { ar: 'مسؤول', en: 'Administrator' },
};

export default function ChatInterface() {
  const { user, language } = useStore();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const usersRef = collection(db, 'users');
    const usersQuery = user.schoolId
      ? query(usersRef, where('schoolId', '==', user.schoolId))
      : user.school
        ? query(usersRef, where('school', '==', user.school))
        : query(usersRef);

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const nextUsers = snapshot.docs
          .filter((item) => item.id !== user.uid)
          .map((item) => {
            const data = item.data();
            return {
              uid: item.id,
              name: data.name || data.email || (language === 'ar' ? 'مستخدم' : 'User'),
              email: data.email,
              role: data.role,
              photoURL: data.photoURL,
            } as ChatUser;
          })
          .sort((a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : 'en'));
        setUsers(nextUsers);
        setLoadingUsers(false);
      },
      (error) => {
        console.error('Failed to subscribe to chat users:', error);
        toast.error(language === 'ar' ? 'تعذر تحميل مستخدمي المدرسة' : 'Could not load school users');
        setLoadingUsers(false);
      },
    );

    return () => unsubscribe();
  }, [language, user?.school, user?.schoolId, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !selectedUser?.uid) return;

    setLoadingMessages(true);
    setMessages([]);
    const messagesRef = collection(db, 'messages');
    const ownMessages = query(
      messagesRef,
      where('senderId', '==', user.uid),
      where('receiverId', '==', selectedUser.uid),
    );
    const incomingMessages = query(
      messagesRef,
      where('senderId', '==', selectedUser.uid),
      where('receiverId', '==', user.uid),
    );

    let sent: Message[] = [];
    let received: Message[] = [];
    const sync = () => {
      const merged = [...sent, ...received].sort((a, b) => {
        const dateValue = (value: Message['createdAt']) => {
          if (!value) return 0;
          if (typeof value === 'object' && 'toDate' in value && value.toDate) return value.toDate().getTime();
          return new Date(value as string | Date).getTime();
        };
        return dateValue(a.createdAt) - dateValue(b.createdAt);
      });
      setMessages(merged);
      setLoadingMessages(false);
    };

    const unsubscribeSent = onSnapshot(ownMessages, (snapshot) => {
      sent = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Message));
      sync();
    }, sync);

    const unsubscribeReceived = onSnapshot(incomingMessages, (snapshot) => {
      received = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Message));
      sync();
      snapshot.docs.forEach((item) => {
        const data = item.data();
        if (!data.read) void updateDoc(doc(db, 'messages', item.id), { read: true });
      });
    }, sync);

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [selectedUser?.uid, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredUsers = useMemo(() => {
    const needle = searchQuery.trim().toLocaleLowerCase(language === 'ar' ? 'ar' : 'en');
    if (!needle) return users;
    return users.filter((item) => `${item.name} ${item.email || ''} ${item.role || ''}`.toLocaleLowerCase().includes(needle));
  }, [language, searchQuery, users]);

  const formatMessageTime = (value: Message['createdAt']) => {
    if (!value) return '';
    const date = typeof value === 'object' && 'toDate' in value && value.toDate
      ? value.toDate()
      : new Date(value as string | Date);
    return format(date, 'p', { locale: language === 'ar' ? ar : enUS });
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.uid || !selectedUser?.uid || (!newMessage.trim() && !attachment)) return;

    const text = newMessage.trim();
    const selectedAttachment = attachment;
    setNewMessage('');
    setAttachment(null);
    try {
      let attachmentUrl: string | undefined;
      if (selectedAttachment) {
        if (selectedAttachment.size > 10 * 1024 * 1024) {
          throw new Error(language === 'ar' ? 'حجم المرفق يتجاوز 10 ميجابايت' : 'Attachment is larger than 10 MB');
        }
        const safeName = selectedAttachment.name.replace(/[^\w\u0600-\u06FF.\- ]/g, '_');
        const attachmentRef = ref(storage, `chat-attachments/${user.uid}/${selectedUser.uid}/${Date.now()}-${safeName}`);
        const uploaded = await uploadBytes(attachmentRef, selectedAttachment, { contentType: selectedAttachment.type || 'application/octet-stream' });
        attachmentUrl = await getDownloadURL(uploaded.ref);
      }
      await addDoc(collection(db, 'messages'), {
        text,
        senderId: user.uid,
        receiverId: selectedUser.uid,
        participants: [user.uid, selectedUser.uid],
        schoolId: user.schoolId || null,
        school: user.school || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: selectedAttachment?.name || null,
        attachmentType: selectedAttachment?.type || null,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(text);
      toast.error(language === 'ar' ? 'تعذر إرسال الرسالة' : 'Could not send the message');
    }
  };

  const getRoleLabel = (role?: string) => roleLabels[role || '']?.[language] || role || (language === 'ar' ? 'مستخدم' : 'User');

  const handleDeleteMessage = async (message: Message) => {
    if (!user?.uid) return;
    const isMine = message.senderId === user.uid;
    const prompt = isMine
      ? (language === 'ar' ? 'حذف الرسالة لدى الجميع؟ لا يمكن التراجع عن هذا الإجراء.' : 'Delete this message for everyone? This cannot be undone.')
      : (language === 'ar' ? 'إخفاء الرسالة من محادثتك؟' : 'Hide this message from your chat?');
    if (!window.confirm(prompt)) return;
    try {
      if (isMine) {
        await deleteDoc(doc(db, 'messages', message.id));
      } else {
        const deletedFor = Array.from(new Set([...(message.deletedFor || []), user.uid]));
        await updateDoc(doc(db, 'messages', message.id), { deletedFor });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error(language === 'ar' ? 'تعذر حذف الرسالة' : 'Could not delete the message');
    }
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[520px] flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <aside className={`w-full shrink-0 border-e border-gray-100 dark:border-gray-700 md:w-80 lg:w-96 ${mobileListVisible ? 'flex' : 'hidden md:flex'} flex-col`}>
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <div className="relative">
            <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={language === 'ar' ? 'ابحث عن طالب أو معلم أو ولي أمر' : 'Search a student, teacher, or parent'}
              className={`w-full rounded-full bg-gray-50 py-2.5 text-sm outline-none ring-blue-500 transition focus:bg-white focus:ring-2 dark:bg-gray-700 dark:text-white dark:focus:bg-gray-600 ${language === 'ar' ? 'pl-4 pr-10' : 'pl-10 pr-4'}`}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <p className="p-6 text-center text-sm text-gray-500">{language === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}</p>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-500">
              <User className="mb-3 h-12 w-12 opacity-20" />
              <p>{language === 'ar' ? 'لا توجد حسابات متاحة للمحادثة في مدرستك.' : 'No school accounts are available for chat.'}</p>
            </div>
          ) : (
            filteredUsers.map((item) => (
              <button
                key={item.uid}
                type="button"
                onClick={() => { setSelectedUser(item); setMobileListVisible(false); }}
                className={`flex w-full items-center gap-3 border-b border-gray-50 p-3 text-start transition hover:bg-blue-50 dark:border-gray-700/50 dark:hover:bg-blue-900/20 ${selectedUser?.uid === item.uid ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{getRoleLabel(item.role)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className={`min-w-0 flex-1 flex-col ${mobileListVisible ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 text-center text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <MessageSquare className="h-16 w-16 opacity-20" />
            <p>{language === 'ar' ? 'اختر حساباً لبدء محادثة آمنة داخل المدرسة.' : 'Choose an account to start a secure school conversation.'}</p>
          </div>
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileListVisible(true)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 md:hidden dark:hover:bg-gray-700">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">{selectedUser.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleLabel(selectedUser.role)}</p>
                </div>
              </div>
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-100 p-4 dark:bg-gray-900">
              {loadingMessages ? <p className="text-center text-sm text-gray-500">{language === 'ar' ? 'جاري تحميل الرسائل...' : 'Loading messages...'}</p> : null}
              {!loadingMessages && messages.length === 0 ? <p className="mt-20 text-center text-sm text-gray-500">{language === 'ar' ? 'لا توجد رسائل بعد. ابدأ المحادثة.' : 'No messages yet. Start the conversation.'}</p> : null}
              {messages.map((message) => {
                const mine = message.senderId === user.uid;
                const hiddenForMe = message.deletedFor?.includes(user.uid);
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group relative max-w-[82%] rounded-2xl px-4 py-2 shadow-sm ${mine ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-white'}`}>
                      {hiddenForMe ? <p className="text-sm italic opacity-60">{language === 'ar' ? 'تم إخفاء هذه الرسالة لديك' : 'This message is hidden for you'}</p> : <>
                        {message.attachmentUrl ? (message.attachmentType?.startsWith('image/') ? <img src={message.attachmentUrl} alt={message.attachmentName || 'Attachment'} className="mb-2 max-h-64 rounded-xl object-contain" /> : <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mb-2 block text-sm font-semibold underline">{message.attachmentName || (language === 'ar' ? 'فتح المرفق' : 'Open attachment')}</a>) : null}
                        {message.text ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p> : null}
                      </>}
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {mine ? (message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />) : null}
                        <button type="button" onClick={() => void handleDeleteMessage(message)} title={mine ? (language === 'ar' ? 'حذف لدى الجميع' : 'Delete for everyone') : (language === 'ar' ? 'إخفاء لدي' : 'Hide for me')} className="ms-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 border-t border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.txt" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} title={language === 'ar' ? 'إضافة صورة أو صوت أو ملف' : 'Attach an image, audio, or file'} className="rounded-full p-3 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-700"><Paperclip className="h-5 w-5" /></button>
              {attachment ? <button type="button" onClick={() => setAttachment(null)} className="max-w-32 truncate rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200" title={attachment.name}>{attachment.name}</button> : null}
              <textarea
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSendMessage(event); } }}
                placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Write your message...'}
                rows={1}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button type="submit" disabled={!newMessage.trim() && !attachment} className="rounded-full bg-blue-600 p-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-5 w-5" /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
