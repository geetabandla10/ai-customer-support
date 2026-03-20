import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, Image as ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 py-2.5 px-3 resize-none max-h-32 text-sm placeholder:text-slate-400 scrollbar-hide"
          disabled={disabled}
        />

        <div className="flex items-center gap-1 pb-1">
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={cn(
              'p-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20',
              message.trim() && !disabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-center text-slate-400 mt-2 font-medium tracking-wide">
        SupportAI can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};

export default ChatInput;
