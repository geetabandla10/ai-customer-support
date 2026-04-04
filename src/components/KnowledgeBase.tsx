import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Database, Trash2, Loader2, CheckCircle2, 
  AlertCircle, FileUp, X, Search, Filter, 
  Activity, ArrowUpRight, Clock, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface KnowledgeBaseFile {
  id: string;
  file_name: string;
  upload_date: string;
  file_type: 'pdf' | 'txt';
  size?: number; // Added for UI
}

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const fetchFiles = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/knowledge-base/${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.email) return;

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      setStatus({ type: 'error', message: 'Only PDF and TXT files are supported.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', user.email);

    try {
      const res = await fetch('/api/upload-knowledge', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Intelligence asset synced successfully!' });
        fetchFiles();
      } else {
        const text = await res.text();
        let errorMessage = `Upload failed (Status ${res.status})`;
        try {
          const errorJson = JSON.parse(text);
          if (errorJson.error) errorMessage = errorJson.error;
        } catch (e) {
          console.error("Non-JSON response from server:", text);
        }
        setStatus({ type: 'error', message: errorMessage });
      }
    } catch (error: any) {
      console.error('File Upload Client Error:', error);
      setStatus({ type: 'error', message: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredFiles = files.filter(f => f.file_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
               <Database className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Intelligence Base</h1>
          </div>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mt-2">Manage your AI's contextual knowledge ecosystem</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Query assets..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500/30 rounded-3xl text-sm font-bold shadow-2xl shadow-indigo-500/5 outline-none transition-all w-full sm:w-64"
            />
          </div>
          <button className="p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-transparent hover:border-indigo-500 transition-all shadow-xl shadow-indigo-500/5">
            <Filter className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
        {/* Sync Center */}
        <div className="xl:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "relative border-2 border-dashed rounded-[3rem] p-10 transition-all duration-500 flex flex-col items-center justify-center text-center overflow-hidden h-[400px]",
              dragActive 
                ? "border-indigo-500 bg-indigo-500/5 scale-[1.02] shadow-2xl shadow-indigo-500/10" 
                : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/20"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
              accept=".pdf,.txt"
            />
            
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 group-hover:scale-110 transition-transform duration-300">
                {isUploading ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                  <FileUp className="w-12 h-12 text-white" />
                )}
              </div>
              <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight relative">
              {isUploading ? "Syncing Logic..." : "Deploy Intelligence"}
            </h3>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8 relative">
              Upload PDF / TXT Archives
            </p>
            
            {!isUploading && (
              <button className="relative z-20 px-10 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-3xl font-black transition-all shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 text-xs uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                Browse Filesystem
              </button>
            )}
          </motion.div>

          {/* Sync Stats */}
          <div className="glass rounded-[2rem] p-8 space-y-6">
             <div className="flex items-center justify-between">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Integrity</p>
               <Shield className="w-3.5 h-3.5 text-emerald-500" />
             </div>
             <div className="space-y-4">
                {[
                  { label: "Sync Latency", value: "< 2.4s", icon: <Clock className="w-4 h-4 text-blue-500" /> },
                  { label: "Processing Load", value: "Normal", icon: <Activity className="w-4 h-4 text-amber-500" /> },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-white/50 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      {stat.icon}
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{stat.label}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">{stat.value}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Assets Feed */}
        <div className="xl:col-span-2 space-y-6">
          <AnimatePresence>
            {status.type && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className={cn(
                  "p-6 rounded-[2rem] mb-6 flex items-center gap-4 border-2 shadow-2xl relative overflow-hidden",
                  status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-emerald-500/5" : "bg-red-500/10 border-red-500/20 text-red-600 shadow-red-500/5"
                )}
              >
                <div className={cn("p-2 rounded-xl", status.type === 'success' ? "bg-emerald-500/20" : "bg-red-500/20")}>
                  {status.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{status.type === 'success' ? 'Operation Success' : 'Deployment Error'}</p>
                  <p className="text-xs font-bold leading-relaxed">{status.message}</p>
                </div>
                <button onClick={() => setStatus({ type: null, message: '' })} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Context Inventory ({files.length})</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFiles.length === 0 ? (
                <div className="md:col-span-2 p-24 text-center glass rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                    <Database className="w-10 h-10" />
                  </div>
                  <p className="text-xs font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">Knowledge Base Empty</p>
                </div>
              ) : (
                filteredFiles.map((file, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={file.id} 
                    className="glass p-6 rounded-[2.5rem] flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className={cn(
                          "w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300 bg-opacity-10 dark:bg-opacity-20 translate-z-0",
                          file.file_type === 'pdf' ? "bg-rose-500 text-rose-600" : "bg-indigo-500 text-indigo-600"
                        )}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2">
                          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {file.file_type}
                          </div>
                          <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate mb-1">
                        {file.file_name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                        <Clock className="w-3 h-3" />
                        Synced {new Date(file.upload_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    
                    <button className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all duration-300 group/btn border border-transparent hover:border-indigo-500">
                      <span className="text-[10px] font-black uppercase tracking-widest">Details</span>
                      <ArrowUpRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
