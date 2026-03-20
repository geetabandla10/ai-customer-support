import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

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

const USER_EMAIL = 'tharun@example.com';

function ChatApp() {
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    content: "Hello! I'm your SupportAI assistant. How can I help you today?",
    isBot: true,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    fetchChats();
  }, []);

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

      if (!response.ok) {
        throw new Error('Failed to fetch bot response');
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
    } catch (error) {
      console.error('Error fetching bot response:', error);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        content: "Sorry, I'm having trouble connecting to the server. Please check if the backend is running.",
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
      />
      <main className="flex-1 min-w-0">
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
