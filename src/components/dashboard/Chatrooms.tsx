import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { MessageSquare, Send, Loader2, Bot } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  createdAt: any;
  isAI?: boolean;
}

interface Class {
  id: string;
  name: string;
  teacherId: string;
}

export default function Chatrooms() {
  const { user, language } = useStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      const q = query(
        collection(db, `classes/${selectedClass.id}/messages`),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(fetchedMessages);
        scrollToBottom();
      });

      return () => unsubscribe();
    }
  }, [selectedClass]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchClasses = async () => {
    if (!user || !auth.currentUser) return;
    try {
      let q;
      if (user.role === 'teacher') {
        q = query(collection(db, 'classes'), where('teacherId', '==', auth.currentUser.uid));
      } else if (user.role === 'student') {
        q = query(collection(db, 'classes'), where('students', 'array-contains', auth.currentUser.uid));
      } else {
        setLoading(false);
        return;
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Class[];
        setClasses(fetchedClasses);
        if (fetchedClasses.length > 0 && !selectedClass) {
          setSelectedClass(fetchedClasses[0]);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching classes:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedClass || !auth.currentUser || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const messageId = crypto.randomUUID();
      await addDoc(collection(db, `classes/${selectedClass.id}/messages`), {
        id: messageId,
        text: messageText,
        senderId: auth.currentUser.uid,
        senderName: user.name || 'User',
        senderRole: user.role,
        createdAt: new Date().toISOString()
      });

      // 2. Check if message is directed to AI (e.g., starts with @ai or @الذكاء)
      if (messageText.toLowerCase().startsWith('@ai') || messageText.startsWith('@الذكاء')) {
        const prompt = messageText.replace(/^@ai/i, '').replace(/^@الذكاء/, '').trim();
        
        if (prompt) {
          // Add a temporary "typing" message or just wait
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are an AI teaching assistant in a class chatroom. The class is "${selectedClass.name}". A ${user.role} named ${user.name} asked: "${prompt}". Provide a helpful, educational, and concise response in ${language === 'en' ? 'English' : 'Arabic'}.`
          });

          if (response.text) {
            const aiMessageId = crypto.randomUUID();
            await addDoc(collection(db, `classes/${selectedClass.id}/messages`), {
              id: aiMessageId,
              text: response.text,
              senderId: 'ai-assistant',
              senderName: language === 'en' ? 'AI Assistant' : 'المساعد الذكي',
              senderRole: 'ai',
              isAI: true,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {language === 'en' ? 'No Chatrooms Available' : 'لا توجد غرف دردشة متاحة'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {language === 'en' ? 'You need to be part of a class to access chatrooms.' : 'يجب أن تكون جزءاً من فصل للوصول إلى غرف الدردشة.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex h-[600px]">
      {/* Sidebar - Class List */}
      <div className="w-1/3 border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            {language === 'en' ? 'Class Chats' : 'محادثات الفصول'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClass(c)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${selectedClass?.id === c.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {selectedClass ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">{selectedClass.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'en' ? 'Tip: Mention @AI for smart assistance' : 'تلميح: اذكر @الذكاء للمساعدة الذكية'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <p>{language === 'en' ? 'No messages yet. Start the conversation!' : 'لا توجد رسائل بعد. ابدأ المحادثة!'}</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {isMe ? (language === 'en' ? 'You' : 'أنت') : msg.senderName}
                        </span>
                        {!isMe && msg.senderRole && !msg.isAI && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                            {msg.senderRole}
                          </span>
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-sm' 
                          : msg.isAI 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-tl-sm border border-purple-200 dark:border-purple-800' 
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm border border-gray-100 dark:border-gray-600'
                      }`}>
                        {msg.isAI && (
                          <div className="flex items-center gap-1 mb-1 text-purple-600 dark:text-purple-400">
                            <Bot className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">AI Assistant</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={language === 'en' ? 'Type a message... (@AI for help)' : 'اكتب رسالة... (@الذكاء للمساعدة)'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'Select a class to start chatting' : 'اختر فصلاً لبدء الدردشة'}
          </div>
        )}
      </div>
    </div>
  );
}
