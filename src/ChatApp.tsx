import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { Zap } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id?: string;
  _id?: string;
  content: string;
  isBot: boolean;
  timestamp: string;
}

interface ChatHistoryItem {
  _id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

function ChatApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const USER_EMAIL = user?.email || '';

  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    content: "Hello! I'm your SupportAI assistant. How can I help you today?",
    isBot: true,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [storageMode, setStorageMode] = useState<'mongodb' | 'json' | null>(null);

  useEffect(() => {
    fetchChats();
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStorageMode(data.storage);
      }
    } catch (e) {
      console.error('Failed to fetch status');
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/chats/${USER_EMAIL}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/messages/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any) => ({
          id: m._id,
          content: m.content,
          isBot: m.isBot,
          timestamp: m.timestamp
        })));
        setCurrentChatId(chatId);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([{
      id: 'welcome',
      content: "Hello! I'm your SupportAI assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const handleSendMessage = async (content: string) => {
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsTyping(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content,
          email: USER_EMAIL,
          chatId: currentChatId
        }),
      });

      let errorMessage = 'Failed to connect. Please check server logs or Vercel config.';
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch(e) {}
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        content: data.reply,
        isBot: true,
        timestamp: data.timestamp,
      }]);

      if (!currentChatId && data.chatId) {
        setCurrentChatId(data.chatId);
      }
      // Refresh chat list to update lastMessage and title
      fetchChats();
    } catch (error: any) {
      console.error('Error fetching bot response:', error);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        content: `Error: ${error.message || 'Failed to connect. Please check browser console for details.'}`,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100">
      <Sidebar 
        chats={chats} 
        onSelectChat={fetchMessages} 
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
        user={user}
        onLogout={() => { logout(); navigate('/login'); }}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        {storageMode === 'json' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-amber-400 text-xs font-medium">
            <Zap className="w-3 h-3" />
            <span>Running in <strong>Temporary Mode</strong> (Local Storage). Messages will be lost on refresh in production. 
              <button 
                onClick={() => window.open('https://github.com/geetabandla10/ai-customer-support#setup', '_blank')}
                className="underline ml-1 hover:text-amber-300"
              >
                Learn how to connect MongoDB
              </button>
            </span>
          </div>
        )}
        <ChatWindow 
          messages={messages as any} 
          onSendMessage={handleSendMessage} 
          isTyping={isTyping} 
        />
      </main>
    </div>
  );
}

export default ChatApp;
