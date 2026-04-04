
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex w-full mb-8 gap-4 px-2 justify-start"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>
      <div className="flex flex-col items-start max-w-[80%]">
        <div className="glass-heavy px-6 py-4 rounded-[2rem] rounded-tl-none border border-white/40 dark:border-white/5 flex gap-1.5 items-center h-10">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
