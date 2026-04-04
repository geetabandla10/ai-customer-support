import React from 'react';
import { Database, Sparkles, User as UserIcon, Link2, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface MessageProps {
  content: string;
  isBot: boolean;
  timestamp: string;
  sources?: {
    file_name: string;
    content: string;
  }[];
  onSuggestionClick?: (message: string) => void;
  onRetry?: () => void;
}

const Message: React.FC<MessageProps> = ({ content, isBot, timestamp, sources, onSuggestionClick, onRetry }) => {
  const [showSources, setShowSources] = React.useState(false);

  // Auto-detect error states from content keywords
  const isError = isBot && (
    content.toLowerCase().includes('error:') || 
    content.toLowerCase().includes('something went wrong') ||
    content.toLowerCase().includes('rate limit') ||
    content.toLowerCase().includes('blackout') ||
    content.toLowerCase().includes('maximum capacity')
  );

  const hasSuggestions = isBot && content.includes('---SUGGESTIONS---');
  const mainContent = hasSuggestions ? content.split('---SUGGESTIONS---')[0].trim() : content;
  const suggestionsText = hasSuggestions ? content.split('---SUGGESTIONS---')[1] : '';
  const suggestions = suggestionsText 
    ? suggestionsText.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-+\s*/, '').replace(/\[|\]/g, '').trim())
    : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn('flex w-full mb-8 gap-4 px-2', isBot ? 'justify-start' : 'justify-start flex-row-reverse')}
    >
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-2">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-300",
          isBot 
            ? (isError ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-indigo-600 text-white shadow-indigo-500/20")
            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-slate-200/50 dark:shadow-none"
        )}>
          {isBot ? (isError ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />) : <UserIcon className="w-5 h-5" />}
        </div>
      </div>

      {/* Content Section */}
      <div className={cn('flex flex-col max-w-[80%]', isBot ? 'items-start' : 'items-end')}>
        {/* Message Bubble */}
        <div
          className={cn(
            'relative px-6 py-4 rounded-[2rem] text-[14px] leading-relaxed shadow-sm transition-all duration-300 group',
            isBot
              ? (isError 
                  ? 'bg-rose-500/5 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 backdrop-blur-md rounded-tl-none'
                  : 'glass-heavy text-slate-800 dark:text-slate-200 rounded-tl-none border border-white/40 dark:border-white/5')
              : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-tr-none shadow-xl shadow-indigo-500/20'
          )}
        >
          <div className="whitespace-pre-wrap">{mainContent}</div>

          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-rose-500/40 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Request
            </button>
          )}          
          {/* Subtle Timestamp */}
          <div className={cn(
            "text-[9px] font-bold uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-40 transition-opacity absolute bottom-[-18px]",
            isBot ? "left-0" : "right-0"
          )}>
            {timestamp}
          </div>
        </div>
        
        {/* Render Follow-up Suggestions */}
        <AnimatePresence>
          {hasSuggestions && suggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-wrap gap-2 mt-4 w-full"
            >
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick && onSuggestionClick(suggestion)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 px-4 py-2 rounded-2xl transition-all shadow-sm active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Sources Section */}
        {isBot && sources && sources.length > 0 && (
          <div className="mt-4 w-full">
            <button 
              onClick={() => setShowSources(!showSources)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-all border border-transparent hover:border-indigo-500/20"
            >
              <div className="p-1 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-md">
                <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Source References ({sources.length})
              </span>
              <div className={cn("transition-transform duration-300 ml-1 text-slate-400", showSources ? "rotate-180" : "")}>
                <Link2 className="w-3 h-3" />
              </div>
            </button>
            
            <AnimatePresence>
              {showSources && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3 overflow-hidden ml-1"
                >
                  <div className="text-[10px] font-black text-indigo-500/60 uppercase tracking-tighter mb-2 flex items-center gap-2">
                    <div className="w-8 h-[1px] bg-indigo-500/20" />
                    Context Retrieval Log
                  </div>
                  {sources.map((source, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={idx} 
                      className="glass rounded-2xl p-4 border border-white/20 dark:border-white/5 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{source.file_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                        "{source.content.trim()}"
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Message;
