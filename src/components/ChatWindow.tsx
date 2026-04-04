import React, { useRef, useEffect, useState } from 'react';
import { 
  Search, MoreVertical, Sparkles, X, Trash2, Download, 
  FileDown, Database, Check, ChevronDown, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import Message from './Message';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ChatWindowProps {
  messages: {
    id: string;
    content: string;
    isBot: boolean;
    timestamp: string;
    sources?: {
      file_name: string;
      content: string;
    }[];
  }[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  onDeleteChat: () => void;
  selectedFileIds: string[];
  onFileIdsChange: (ids: string[]) => void;
  availableFiles: any[];
  onRetry?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  onSendMessage, 
  isTyping, 
  onDeleteChat,
  selectedFileIds,
  onFileIdsChange,
  availableFiles,
  onRetry
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isKBMenuOpen, setIsKBMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const kbMenuRef = useRef<HTMLDivElement>(null);

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
      if (kbMenuRef.current && !kbMenuRef.current.contains(e.target as Node)) {
        setIsKBMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const handleExportChatTxt = () => {
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

  const handleExportPDF = () => {
    setIsMenuOpen(false);
    if (!scrollRef.current) return;
    
    // Create a deep clone to avoid modifying the actual DOM
    const clone = scrollRef.current.cloneNode(true) as HTMLElement;
    clone.style.height = 'auto'; // Remove scroll restrictions
    clone.style.overflow = 'visible';
    clone.style.padding = '20px';
    clone.style.background = '#ffffff'; // Force white background for PDF
    clone.style.color = '#000000';
    
    // Force light mode styles on the clone
    clone.classList.remove('dark');
    const darkElements = clone.querySelectorAll('.dark');
    darkElements.forEach(el => el.classList.remove('dark'));
    
    // Explicitly set colors for bot/user bubbles in clone to handle any theme variables
    const botBubbles = clone.querySelectorAll('.bg-slate-800');
    botBubbles.forEach(el => {
      (el as HTMLElement).style.background = '#f1f5f9';
      (el as HTMLElement).style.color = '#1e293b';
      (el as HTMLElement).style.borderColor = '#e2e8f0';
    });
    
    // Hide typing indicators in the clone if any
    const typingIndicators = clone.querySelectorAll('.animate-pulse');
    typingIndicators.forEach(el => el.remove());

    const opt = {
      margin: 10,
      filename: `Chat-SupportAI-${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(clone).save();
  };

  const handleClearChat = () => {
    setIsMenuOpen(false);
    if (onDeleteChat) {
      if (window.confirm('Delete this chat history permanently?')) {
        onDeleteChat();
      }
    } else {
      window.location.reload();
    }
  };

  const toggleFileSelection = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      onFileIdsChange(selectedFileIds.filter(id => id !== fileId));
    } else {
      onFileIdsChange([...selectedFileIds, fileId]);
    }
  };

  const toggleAllFiles = () => {
    if (selectedFileIds.length === availableFiles.length) {
      onFileIdsChange([]);
    } else {
      onFileIdsChange(availableFiles.map(f => f.id));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 dark:from-indigo-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="h-20 flex items-center justify-between px-8 glass-heavy border-b border-white/20 dark:border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900 shadow-sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-none tracking-tight">SupportAI Expert</h2>
              <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-black uppercase tracking-widest">R1 Elite</div>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Global Intelligence System</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* KB Selector */}
          <div className="relative" ref={kbMenuRef}>
            <button
              onClick={() => setIsKBMenuOpen(!isKBMenuOpen)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2",
                selectedFileIds.length > 0
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/50 dark:bg-slate-800/50 border-white/50 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Database className="w-4 h-4" />
              <span>
                {selectedFileIds.length === 0 
                  ? "Search Pool: All" 
                  : `Context: ${selectedFileIds.length} Assets`}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", isKBMenuOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isKBMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-14 w-72 glass-heavy rounded-3xl shadow-2xl z-50 py-3 overflow-hidden border border-white/20 dark:border-white/5"
                >
                  <div className="px-5 py-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between bg-white/30 dark:bg-slate-900/30">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retrieval Sources</span>
                    <button 
                      onClick={toggleAllFiles}
                      className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest"
                    >
                      {selectedFileIds.length === availableFiles.length ? "Clear Selection" : "Sync All"}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar px-1 py-1">
                    {availableFiles.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <Database className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No assets synced</p>
                      </div>
                    ) : (
                      availableFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => toggleFileSelection(file.id)}
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/40 dark:hover:bg-slate-800/40 rounded-2xl transition-all text-left group"
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                            selectedFileIds.includes(file.id)
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-200 dark:border-slate-700 group-hover:border-indigo-400"
                          )}>
                            {selectedFileIds.includes(file.id) && <Check className="w-3 h-3 stroke-[4]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.file_name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{file.file_type} • Sync Ready</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />

          <button
            onClick={() => { setIsSearchOpen(v => !v); setSearchQuery(''); }}
            className={cn(
              "p-3 rounded-2xl transition-all active:scale-90",
              isSearchOpen ? "bg-indigo-600 text-white" : "p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(v => !v)}
              className={cn(
                "p-3 rounded-2xl transition-all active:scale-90",
                isMenuOpen ? "bg-indigo-600 text-white" : "p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-14 w-56 glass-heavy rounded-3xl shadow-2xl z-50 py-2 overflow-hidden border border-white/20 dark:border-white/5"
                >
                  <button
                    onClick={handleExportChatTxt}
                    className="w-full flex items-center gap-3 px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Plain Text Log
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <FileDown className="w-4 h-4" />
                    Premium PDF Report
                  </button>
                  <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1 mx-3" />
                  <button
                    onClick={handleClearChat}
                    className="w-full flex items-center gap-3 px-5 py-3 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Wipe session
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-8 py-4 glass border-b border-white/20 dark:border-white/5 flex items-center gap-4 z-10 overflow-hidden"
          >
            <Search className="w-5 h-5 text-indigo-500 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversation history..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                {filteredMessages.length} results
              </span>
            )}
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-12 pb-8 custom-scrollbar relative z-0"
      >
        <div className="max-w-4xl mx-auto px-6">
          {/* Welcome section */}
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center mb-16 mt-10 text-center"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 relative z-10 animate-pulse-slow">
                  <Sparkles className="w-12 h-12" />
                </div>
                <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">How can we optimize your workflow?</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Connect your knowledge base and let SupportAI Elite handle the analysis. We're online and ready to assist.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full max-w-lg">
                {[
                  { label: "Check status of order #9021", icon: <Check /> },
                  { label: "Summarize recent knowledge", icon: <Database /> },
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => onSendMessage(item.label)}
                    className="glass p-4 rounded-3xl text-left hover:border-indigo-500 transition-all group flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-3 h-3 text-indigo-600" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {(searchQuery ? filteredMessages : messages).map((msg) => (
            <Message
              key={msg.id}
              content={msg.content}
              isBot={msg.isBot}
              timestamp={msg.timestamp}
              sources={msg.sources}
              onSuggestionClick={onSendMessage}
              onRetry={onRetry}
            />
          ))}
          {isTyping && !searchQuery && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <TypingIndicator />
            </motion.div>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSendMessage={onSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatWindow;
