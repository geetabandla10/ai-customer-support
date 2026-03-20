import React from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '../utils/cn';

interface MessageProps {
  content: string;
  isBot: boolean;
  timestamp: string;
}

const Message: React.FC<MessageProps> = ({ content, isBot, timestamp }) => {
  return (
    <div className={cn('flex w-full mb-6 gap-3 group px-4', isBot ? 'justify-start' : 'justify-end')}>
      {isBot && (
        <div className="w-9 h-9 min-w-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shadow-sm">
          <Bot className="w-5 h-5" />
        </div>
      )}

      <div className={cn('flex flex-col max-w-[80%]', isBot ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-200',
            isBot
              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
              : 'bg-blue-600 text-white rounded-tr-none hover:bg-blue-700'
          )}
        >
          {content}
        </div>
        <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium uppercase tracking-wider">{timestamp}</span>
      </div>

      {!isBot && (
        <div className="w-9 h-9 min-w-9 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            TB
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
