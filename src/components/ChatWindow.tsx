import React, { useRef, useEffect, useState } from 'react';
import { Search, MoreVertical, Sparkles, X, Trash2, Download, HelpCircle } from 'lucide-react';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const handleExportChat = () => {
    setIsMenuOpen(false);
    const text = messages
      .map(m => `[${m.timestamp}] ${m.isBot ? 'SupportAI' : 'You'}: ${m.content}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-export.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearChat = () => {
    setIsMenuOpen(false);
    window.location.reload();
  };

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
          {/* Search toggle */}
          <button
            onClick={() => { setIsSearchOpen(v => !v); setSearchQuery(''); }}
            className={`p-2.5 rounded-xl transition-all ${isSearchOpen ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(v => !v)}
              className={`p-2.5 rounded-xl transition-all ${isMenuOpen ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                <button
                  onClick={handleExportChat}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Export Chat
                </button>
                <button
                  onClick={() => { setIsMenuOpen(false); window.open('/admin', '_blank'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Admin Dashboard
                </button>
                <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                <button
                  onClick={handleClearChat}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="px-6 py-2 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 z-10">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
          {searchQuery && (
            <span className="text-xs text-slate-400 shrink-0">
              {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
          </button>
        </div>
      )}

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

          {(searchQuery ? filteredMessages : messages).map((msg) => (
            <Message
              key={msg.id}
              content={msg.content}
              isBot={msg.isBot}
              timestamp={msg.timestamp}
            />
          ))}
          {isTyping && !searchQuery && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSendMessage={onSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatWindow;
