import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { Search, Send, Paperclip, MoreVertical, ArrowLeft, Phone, Video, Info, User, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  read: boolean;
}

interface ChatUser {
  uid: string;
  name: string;
  role: string;
  photoURL?: string;
  lastMessage?: Message;
  unreadCount?: number;
}

export default function ChatInterface() {
  const { user, language } = useStore();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch users to chat with (based on role/school)
  useEffect(() => {
    if (!user) return;

    const usersRef = collection(db, 'users');
    let q;

    // Simplified query for demo: fetch users in the same school
    if (user.school) {
      q = query(usersRef, where('school', '==', user.school));
    } else {
      q = query(usersRef); // Fallback
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const fetchedUsers: ChatUser[] = [];
        snapshot.forEach((doc) => {
          if (doc.id !== user.uid) {
            fetchedUsers.push({ uid: doc.id, ...doc.data() } as ChatUser);
          }
        });
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);
      },
      (error) => {
        console.warn('Chat users snapshot notice:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for selected user
  useEffect(() => {
    if (!user || !selectedUser) return;

    const messagesRef = collection(db, 'messages');
    const q1 = query(
      messagesRef,
      where('senderId', '==', user.uid),
      where('receiverId', '==', selectedUser.uid),
      orderBy('createdAt', 'asc')
    );

    const q2 = query(
      messagesRef,
      where('senderId', '==', selectedUser.uid),
      where('receiverId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    // In a real app, you'd combine these queries or structure data differently
    // For this demo, we'll listen to both and merge
    const unsubscribe1 = onSnapshot(
      q1, 
      (snapshot) => {
        // Handle sent messages
      },
      (error) => {
        console.warn('Sent messages snapshot notice:', error);
      }
    );

    const unsubscribe2 = onSnapshot(
      q2, 
      (snapshot) => {
        // Handle received messages
        // Mark as read
      },
      (error) => {
        console.warn('Received messages snapshot notice:', error);
      }
    );

    // Simplified message fetching for demo purposes
    // A better approach is a 'chats' collection with subcollections of messages
    const fetchMessages = async () => {
      // Demo data for now since complex queries need composite indexes
      setMessages([
        {
          id: '1',
          text: language === 'en' ? 'Hello! How can I help you today?' : 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
          senderId: selectedUser.uid,
          receiverId: user.uid,
          createdAt: new Date(Date.now() - 3600000),
          read: true
        },
        {
          id: '2',
          text: language === 'en' ? 'I have a question about the recent assignment.' : 'لدي سؤال حول الواجب الأخير.',
          senderId: user.uid,
          receiverId: selectedUser.uid,
          createdAt: new Date(Date.now() - 1800000),
          read: true
        }
      ]);
    };

    fetchMessages();

    return () => {
      // unsubscribe1();
      // unsubscribe2();
    };
  }, [user, selectedUser, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(lowerQuery)));
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update
    const newMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      senderId: user.uid,
      receiverId: selectedUser.uid,
      createdAt: new Date(),
      read: false
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        senderId: user.uid,
        receiverId: selectedUser.uid,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (date: any) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return format(d, 'h:mm a', { locale: language === 'ar' ? ar : enUS });
  };

  const selectUser = (u: ChatUser) => {
    setSelectedUser(u);
    setIsMobileListVisible(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
      
      {/* Sidebar / Chat List */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-100 dark:border-gray-700 flex flex-col ${!isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search...' : 'بحث...'}
              className={`w-full ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-gray-50 dark:bg-gray-700 border-transparent rounded-full focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white`}
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filteredUsers.map((u) => (
                <li 
                  key={u.uid} 
                  onClick={() => selectUser(u)}
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors flex items-center gap-3 ${selectedUser?.uid === u.uid ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {u.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                        {/* Time placeholder */}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {u.role}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-6 text-center">
              <User className="w-12 h-12 mb-4 opacity-20" />
              <p>{language === 'en' ? 'No users found.' : 'لم يتم العثور على مستخدمين.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#e5ddd5] dark:bg-gray-900 ${isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                    {selectedUser.name}
                  </h2>
                  <p className="text-xs text-blue-500 dark:text-blue-400">
                    {language === 'en' ? 'Online' : 'متصل الآن'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-gray-500 dark:text-gray-400">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors hidden sm:block">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors hidden sm:block">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] dark:bg-gray-900" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', backgroundBlendMode: 'overlay' }}>
              {messages.map((msg, index) => {
                const isMine = msg.senderId === user?.uid;
                const showTail = index === 0 || messages[index - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div 
                      className={`relative max-w-[85%] sm:max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                        isMine 
                          ? 'bg-[#dcf8c6] dark:bg-blue-600 text-gray-900 dark:text-white rounded-tr-none' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'
                      }`}
                    >
                      {/* Tail triangle */}
                      {showTail && (
                        <div className={`absolute top-0 w-0 h-0 border-solid border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ${
                          isMine 
                            ? 'right-[-8px] border-l-[10px] border-l-[#dcf8c6] dark:border-l-blue-600' 
                            : 'left-[-8px] border-r-[10px] border-r-white dark:border-r-gray-800'
                        }`} />
                      )}
                      
                      <p className="text-[15px] leading-relaxed break-words pr-12">
                        {msg.text}
                      </p>
                      
                      <div className="absolute bottom-1 right-2 flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 dark:text-gray-300/70">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                        {isMine && (
                          <span className="text-blue-500 dark:text-blue-300">
                            {msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#f0f0f0] dark:bg-gray-800 flex items-end gap-2 z-10">
              <button type="button" className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                <Paperclip className="w-6 h-6" />
              </button>
              
              <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={language === 'en' ? 'Type a message' : 'اكتب رسالة'}
                  className="flex-1 max-h-32 min-h-[44px] bg-white dark:bg-gray-700 border-transparent rounded-2xl px-4 py-3 focus:ring-0 focus:border-transparent resize-none outline-none text-gray-900 dark:text-white shadow-sm"
                  rows={1}
                />
                
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                >
                  <Send className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-[#f0f0f0] dark:bg-gray-900">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'WhatsApp Web' : 'واتساب ويب'}
            </h3>
            <p className="text-sm">
              {language === 'en' ? 'Select a chat to start messaging' : 'حدد محادثة للبدء في المراسلة'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
