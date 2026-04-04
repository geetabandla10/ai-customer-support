import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image as ImageIcon, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = () => {
    if ((message.trim() || selectedFile) && !disabled) {
      const content = selectedFile 
        ? `${message.trim()} [Attached: ${selectedFile.name}]`
        : message.trim();
      onSendMessage(content);
      setMessage('');
      setSelectedFile(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = '60px'; // Reset to default height
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
      textareaRef.current.style.height = '60px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className="relative px-6 pb-8 pt-4">
      <div className="max-w-4xl mx-auto">
        <AnimatePresence>
          {selectedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-3 flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-indigo-500/5 animate-in fade-in"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-all font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "relative flex items-end gap-3 glass-heavy rounded-[2.5rem] p-3 border-2 transition-all duration-500 shadow-2xl shadow-indigo-500/5 group/input",
          isFocused 
            ? "border-indigo-500/50 dark:border-indigo-500/30 ring-4 ring-indigo-500/10 scale-[1.005]" 
            : "border-white/50 dark:border-white/5"
        )}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          
          <div className="flex items-center gap-1 mb-1 ml-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all active:scale-90 hidden sm:block"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or share a file..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-100 py-3.5 px-4 resize-none max-h-48 text-[15px] font-medium placeholder:text-slate-400/80 custom-scrollbar"
            disabled={disabled}
          />

          <div className="mb-1 mr-1">
            <button
              onClick={handleSend}
              disabled={(!message.trim() && !selectedFile) || disabled}
              className={cn(
                'group h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-300 active:scale-90',
                (message.trim() || selectedFile) && !disabled
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:-translate-y-1'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
              )}
            >
              <Send className={cn(
                "w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                (message.trim() || selectedFile) && !disabled ? "text-white" : ""
              )} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">DeepSeek R1</span>
          </div>
          <div className="flex items-center gap-1.5">
             <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enhanced Context Management</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
