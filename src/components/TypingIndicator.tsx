import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator = () => {
  return (
    <div className="flex w-full mb-6 gap-3 px-4 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-9 h-9 min-w-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shadow-sm">
        <Bot className="w-5 h-5" />
      </div>
      <div className="flex flex-col items-start">
        <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1 items-center h-10">
          <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
