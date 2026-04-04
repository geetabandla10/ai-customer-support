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
  sources?: {
    file_name: string;
    content: string;
  }[];
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
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);

  const [storageMode, setStorageMode] = useState<'mongodb' | 'json' | null>(null);

  useEffect(() => {
    fetchChats();
    fetchStatus();
    fetchAvailableFiles();
  }, []);

  const fetchAvailableFiles = async () => {
    if (!USER_EMAIL) return;
    try {
      const res = await fetch(`/api/knowledge-base/${USER_EMAIL}`);
      if (res.ok) {
        setAvailableFiles(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch files');
    }
  };

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
          timestamp: m.timestamp,
          sources: m.sources
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

  const handleDeleteChat = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentChatId === id) {
          handleNewChat();
        }
        fetchChats();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleSendMessage = async (content: string, isRetry = false) => {
    if (!content.trim()) return;

    // Cancel existing request if any
    if (abortController) {
      abortController.abort();
    }

    const newController = new AbortController();
    setAbortController(newController);

    if (!isRetry) {
      const newUserMessage: ChatMessage = {
        id: Date.now().toString(),
        content,
        isBot: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, newUserMessage]);
    } else {
      // If retrying, remove the last error message if it exists
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.isBot && lastMsg.content.includes("Something went wrong")) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }

    setIsTyping(true);
    
    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, {
      id: botMessageId,
      content: '',
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content,
          email: USER_EMAIL,
          chatId: currentChatId,
          fileIds: selectedFileIds
        }),
        signal: newController.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            let data: any;
            try {
              data = JSON.parse(line.slice(6));
            } catch (e) {
              continue;
            }
            
            if (data.isError) {
              throw new Error(data.text);
            }

            if (data.text) {
              setIsTyping(false); 
              accumulatedText += data.text;
              setMessages((prev) => 
                prev.map(m => m.id === botMessageId ? { ...m, content: accumulatedText } : m)
              );
            }

            if (data.done) {
              if (!currentChatId && data.chatId) {
                setCurrentChatId(data.chatId);
              }
              setMessages((prev) => 
                prev.map(m => m.id === botMessageId ? { 
                  ...m, 
                  timestamp: data.timestamp,
                  sources: data.sources 
                } : m)
              );
              fetchChats();
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Bot Response Error:', error);
      // Use the actual error message from the backend if available
      const errorMessage = error.message || "Something went wrong. Please try again.";

      setMessages((prev) => 
        prev.map(m => m.id === botMessageId 
          ? { ...m, content: errorMessage } 
          : m
        )
      );
    } finally {
      setIsTyping(false);
      setAbortController(null);
    }
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => !m.isBot);
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content, true);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0f111a] overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100">
      <Sidebar 
        chats={chats} 
        onSelectChat={fetchMessages} 
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
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
          onDeleteChat={() => currentChatId && handleDeleteChat(currentChatId)}
          selectedFileIds={selectedFileIds}
          onFileIdsChange={setSelectedFileIds}
          availableFiles={availableFiles}
          onRetry={handleRetry}
        />
      </main>
    </div>
  );
}

export default ChatApp;
