import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, MessageSquare, Database, Zap,
  ArrowRight, Upload, Clock, ChevronRight,
  Bot, TrendingUp,
  Activity, Star, Plus, Users, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { cn } from '../utils/cn';
import { Skeleton } from './Skeleton';

interface KnowledgeBaseFile {
  id: string;
  file_name: string;
  upload_date: string;
  file_type: 'pdf' | 'txt';
}

interface ChatHistoryItem {
  _id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    let totalMiliseconds = 1000;
    let incrementTime = (totalMiliseconds / end);

    let timer = setInterval(() => {
      start += 1;
      setDisplayValue(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string; delay: number }> = ({ icon, label, value, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -5 }}
    className="relative glass rounded-2xl p-6 overflow-hidden group transition-all duration-300"
  >
    <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity bg-current", color)} />
    <div className="flex items-start justify-between mb-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300 bg-opacity-10", color.replace('text-', 'bg-'))}>
        <div className={color}>{icon}</div>
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
        <TrendingUp className="w-3 h-3" />
        +12%
      </div>
    </div>
    <div>
      <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        <AnimatedNumber value={value} />
      </h3>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  </motion.div>
);

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [totalQueries, setTotalQueries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const [filesRes, chatsRes] = await Promise.all([
        fetch(`/api/knowledge-base/${user.email}`),
        fetch(`/api/chats/${user.email}`)
      ]);

      if (filesRes.ok) setFiles(await filesRes.json());
      if (chatsRes.ok) {
        const chatData: ChatHistoryItem[] = await chatsRes.json();
        setChats(chatData);
        setTotalQueries(chatData.length * 4); // Mock calculation
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recentChats = chats.slice(0, 5);

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden">
      <Sidebar
        chats={chats}
        onSelectChat={(_id) => navigate('/')}
        onNewChat={() => navigate('/')}
        currentChatId={null}
        user={user}
        onLogout={() => { logout(); navigate('/login'); }}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full space-y-10">

          {/* Welcome Header */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between flex-wrap gap-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest px-1">
                <Activity className="w-3.5 h-3.5" />
                Active Session
              </div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">{user?.name?.split(' ')[0] || 'Explorer'}</span> 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm leading-relaxed">
                Your SupportAI workspace is optimized and ready. You have processed {files.length} documents today.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')}
                className="group flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
              >
                <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Launch Assistant
              </button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={<FileText className="w-6 h-6" />} label="Knowledge Assets" value={files.length} color="text-blue-500 bg-blue-500" delay={0.1} />
            <StatCard icon={<MessageSquare className="w-6 h-6" />} label="Conversations" value={chats.length} color="text-indigo-500 bg-indigo-500" delay={0.2} />
            <StatCard icon={<Zap className="w-6 h-6" />} label="AI Tokens Used" value={totalQueries} color="text-amber-500 bg-amber-500" delay={0.3} />
            <StatCard icon={<Star className="w-6 h-6" />} label="Model Accuracy" value={98} color="text-emerald-500 bg-emerald-500" delay={0.4} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recent Conversations */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Recent Conversations
                </h2>
                <button onClick={() => navigate('/')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View All History
                </button>
              </div>

              <div className="glass rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/50">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-5 flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : recentChats.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No conversations yet</p>
                    <button onClick={() => navigate('/')} className="mt-4 text-indigo-500 font-bold hover:underline">Start your first session</button>
                  </div>
                ) : (
                  recentChats.map((chat, i) => (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      key={chat._id}
                      onClick={() => navigate('/')}
                      className="w-full p-5 flex items-start gap-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {chat.title || 'Support Query'}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                          {chat.lastMessage || 'Thinking about a solution...'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                           <Clock className="w-3 h-3" />
                           {new Date(chat.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* Knowledge Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  System Sync
                </h2>
                <button onClick={() => navigate('/upload')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Plus className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="glass rounded-3xl p-6 space-y-6">
                <div className="space-y-4">
                  {[
                    { label: 'PDF Vectorization', percentage: 92, color: 'bg-blue-500' },
                    { label: 'Token Accuracy', percentage: 78, color: 'bg-indigo-500' },
                    { label: 'Context Buffer', percentage: 45, color: 'bg-violet-500' },
                  ].map(item => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-tight text-slate-400">
                        <span>{item.label}</span>
                        <span>{item.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={cn("h-full rounded-full shadow-lg shadow-current/20", item.color)} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => navigate('/upload')}
                  className="w-full group mt-2 bg-slate-100/50 dark:bg-white/5 hover:bg-indigo-600 hover:text-white dark:text-slate-300 dark:hover:bg-indigo-600 p-4 rounded-2xl transition-all duration-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center group-hover:bg-white/20">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Sync New Assets</span>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

            {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Bot className="w-5 h-5" />, label: 'AI Configuration', desc: 'Adjust model temperature & tone', color: 'from-blue-500 to-indigo-500' },
              { icon: <Users className="w-5 h-5" />, label: 'Team Workspace', desc: 'Collaborative knowledge sharing', color: 'from-indigo-500 to-violet-500' },
              { icon: <Shield className="w-5 h-5" />, label: 'Data Security', desc: 'Manage RAG encryption keys', color: 'from-violet-500 to-purple-500' },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ y: -5, x: 5 }}
                className="glass rounded-2xl p-5 text-left group overflow-hidden"
              >
                <div className={cn("inline-flex w-10 h-10 rounded-xl items-center justify-center mb-4 text-white shadow-lg shadow-indigo-500/20 bg-gradient-to-br", item.color)}>
                  {item.icon}
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.label}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
