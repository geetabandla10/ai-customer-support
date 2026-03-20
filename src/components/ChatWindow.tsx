import React, { useRef, useEffect } from 'react';
import { Search, Phone, Video, MoreVertical, Sparkles } from 'lucide-react';
import Message from './Message';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isTyping }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0f111a] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-none">SupportAI Agent</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Online</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-[10px] text-slate-400 font-medium">Responds in {"<"} 1m</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all hidden sm:block">
            <Video className="w-5 h-5" />
          </button>
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
          <button className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-6 pb-4 custom-scrollbar relative z-0"
      >
        <div className="max-w-4xl mx-auto px-4">
          {/* Welcome section */}
          <div className="flex flex-col items-center justify-center mb-12 mt-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-blue-500/20">
              <Sparkles className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">How can we help today?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Our AI support assistant is here to help with orders, technical issues, or any general questions.
            </p>
          </div>

          {messages.map((msg) => (
            <Message
              key={msg.id}
              content={msg.content}
              isBot={msg.isBot}
              timestamp={msg.timestamp}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSendMessage={onSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatWindow;
