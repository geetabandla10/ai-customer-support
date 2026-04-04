import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Trash2, Edit2, Plus, X,
  Users, FileText, Zap, BarChart2, Database,
  ChevronRight, Bot, User as UserIcon, Eye, Search,
  Activity, HelpCircle
} from 'lucide-react';
import { cn } from '../utils/cn';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category?: 'general' | 'technical' | 'billing';
}

interface Message {
  _id: string;
  content: string;
  isBot: boolean;
}

interface UserChat {
  _id: string;
  title: string;
  lastMessage: string;
  userId: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  picture?: string;
  avatar?: string;
  chatCount: number;
  fileCount: number;
}

interface Analytics {
  totalChats: number;
  activeUsers: number;
  totalKnowledge: number;
  totalUsers: number;
  totalQueries: number;
  totalFiles: number;
  successRate: string;
  growth: { name: string; chats: number; users: number }[];
  distribution: { name: string; value: number }[];
}

import { 
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#4F46E5', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

const AdminStatCard = ({ icon, label, value, color, delay }: { icon: React.ReactNode; label: string; value: number | string; color: string; delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={{ y: -5 }}
    className="relative glass rounded-2xl p-6 overflow-hidden group transition-all duration-300"
  >
    <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity bg-current", color)} />
    <div className="flex items-center gap-4 mb-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300 bg-opacity-10", color.replace('text-', 'bg-'))}>
        <div className={color}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value ?? '—'}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'chats' | 'faqs'>('overview');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [chats, setChats] = useState<UserChat[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Chat history viewer
  const [selectedChat, setSelectedChat] = useState<UserChat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // FAQ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  const fetchChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/chats');
      if (res.ok) setChats(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch('/api/faqs');
      if (res.ok) setFaqs(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const viewChatMessages = async (chat: UserChat) => {
    setSelectedChat(chat);
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/messages/${chat._id}`);
      if (res.ok) setChatMessages(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoadingMessages(false); }
  };

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'chats') fetchChats();
    else if (activeTab === 'faqs') fetchFaqs();
  }, [activeTab, fetchAnalytics, fetchUsers, fetchChats, fetchFaqs]);

  const handleSaveFaq = async () => {
    setIsSaving(true);
    try {
      const url = editingFaq ? `/api/faqs/${editingFaq._id}` : '/api/faqs';
      const method = editingFaq ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(faqForm) });
      if (!res.ok) throw new Error((await res.json()).error || 'Server error');
      setIsModalOpen(false); setEditingFaq(null); setFaqForm({ question: '', answer: '' }); fetchFaqs();
    } catch (err: any) { alert(`Error: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    await fetch(`/api/faqs/${id}`, { method: 'DELETE' });
    fetchFaqs();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'chats', label: 'Chat History', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'faqs', label: 'Manage FAQs', icon: <HelpCircle className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Panel</span> ⚙️
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage your RAG pipeline, users, and platform growth.</p>
          </div>
          
          <div className="flex items-center gap-3 glass p-1.5 rounded-2xl shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedChat(null); }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <AdminStatCard icon={<Users className="w-6 h-6" />} label="Users" value={analytics?.totalUsers ?? 0} color="text-blue-500" delay={0.1} />
                  <AdminStatCard icon={<MessageSquare className="w-6 h-6" />} label="Chats" value={analytics?.totalChats ?? 0} color="text-indigo-500" delay={0.2} />
                  <AdminStatCard icon={<Zap className="w-6 h-6" />} label="Queries" value={analytics?.totalQueries ?? 0} color="text-amber-500" delay={0.3} />
                  <AdminStatCard icon={<Database className="w-6 h-6" />} label="Assets" value={analytics?.totalFiles ?? 0} color="text-emerald-500" delay={0.4} />
                  <AdminStatCard icon={<Activity className="w-6 h-6" />} label="Online" value={analytics?.activeUsers ?? 0} color="text-violet-500" delay={0.5} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Growth Chart */}
                  <div className="glass rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-500" /> Platform Growth
                      </h3>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Last 30 Days</div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { name: 'Week 1', chats: 45, users: 12 },
                          { name: 'Week 2', chats: 89, users: 24 },
                          { name: 'Week 3', chats: 156, users: 38 },
                          { name: 'Week 4', chats: analytics?.totalChats || 200, users: analytics?.totalUsers || 42 },
                        ]}>
                          <defs>
                            <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey="chats" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorChats)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Distribution */}
                  <div className="glass rounded-3xl p-8">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-500" /> Content Distribution
                    </h3>
                    <div className="h-64 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'System Docs', value: 40 },
                              { name: 'User Files', value: 35 },
                              { name: 'FAQs', value: 25 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {COLORS.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <div className="glass rounded-3xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="font-bold text-slate-900 dark:text-white">Access Management</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{users.length} Total</span>
                  </div>
                </div>
                {isLoading ? (
                  <div className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-4">Identity</th>
                          <th className="px-8 py-4 text-center">Engagement</th>
                          <th className="px-8 py-4 text-center">Inventory</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {users.map(user => (
                          <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                {user.picture
                                  ? <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                                  : <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">{user.avatar}</div>
                                }
                                <div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold">
                                <MessageSquare className="w-3 h-3" /> {user.chatCount} Chats
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold">
                                <FileText className="w-3 h-3" /> {user.fileCount} Assets
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button
                                onClick={() => setActiveTab('chats')}
                                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── CHATS TAB ── */}
            {activeTab === 'chats' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Chat Index */}
                <div className="glass rounded-3xl overflow-hidden flex flex-col max-h-[700px]">
                  <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      Communication Logs
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/50 overflow-y-auto custom-scrollbar">
                    {chats.length === 0 ? (
                      <div className="p-20 text-center text-slate-400">No logs found.</div>
                    ) : chats.map(chat => (
                      <button
                        key={chat._id}
                        onClick={() => viewChatMessages(chat)}
                        className={cn(
                          "w-full px-6 py-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-left",
                          selectedChat?._id === chat._id && "bg-indigo-500/5 dark:bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold shrink-0">
                          {chat.userId?.avatar || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{chat.title || 'Support Session'}</p>
                            <ChevronRight className={cn("w-4 h-4 transition-transform", selectedChat?._id === chat._id && "rotate-90 text-indigo-500")} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 truncate mb-1 uppercase tracking-tighter">{chat.userId?.name} ({chat.userId?.email})</p>
                          <p className="text-[11px] text-slate-500 truncate italic">"{chat.lastMessage}"</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Viewer */}
                <div className="glass rounded-3xl overflow-hidden flex flex-col h-full max-h-[700px]">
                  <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      Insight Viewer
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/20">
                    {!selectedChat ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                          <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select an entry to analyze</p>
                      </div>
                    ) : isLoadingMessages ? (
                      <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg._id} className={cn("flex gap-4", msg.isBot ? "items-start" : "items-start flex-row-reverse")}>
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                            msg.isBot ? "bg-white dark:bg-slate-800 text-indigo-600" : "bg-indigo-600 text-white"
                          )}>
                            {msg.isBot ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                          </div>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm",
                            msg.isBot
                              ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800"
                              : "bg-indigo-600 text-white rounded-tr-none"
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── FAQs TAB ── */}
            {activeTab === 'faqs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Knowledge Base FAQs</h2>
                    <p className="text-xs text-slate-500">Manually tune the AI fallback logic and quick-answers.</p>
                  </div>
                  <button
                    onClick={() => { setEditingFaq(null); setFaqForm({ question: '', answer: '' }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 text-xs"
                  >
                    <Plus className="w-4 h-4" /> New Entry
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {faqs.length === 0 ? (
                    <div className="md:col-span-2 text-center py-24 glass rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <HelpCircle className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No entries defined yet</p>
                    </div>
                  ) : faqs.map(faq => (
                    <div key={faq._id} className="glass rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all group">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            {faq.question.split(' ').slice(0, 2).join(' ')}...
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer }); setIsModalOpen(true); }}
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteFaq(faq._id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm leading-tight leading-snug">{faq.question}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-3">{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FAQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-10 w-full max-w-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-10 relative">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingFaq ? 'Modify Expert Insight' : 'Define New Response'}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Platform Intelligence Configuration</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-2xl p-2.5 transition-all active:scale-95 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8 relative">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Direct Question</label>
                <input 
                  type="text" 
                  value={faqForm.question} 
                  onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-900/50 rounded-3xl p-5 text-sm font-bold outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700" 
                  placeholder="What is the standard procedure for...?" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Automated Resolution</label>
                <textarea 
                  value={faqForm.answer} 
                  onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} 
                  rows={6}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-900/50 rounded-3xl p-5 text-sm font-medium outline-none transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-relaxed" 
                  placeholder="The standard procedure involves..." 
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-12 relative">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-8 py-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-all text-sm active:scale-95"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveFaq} 
                disabled={!faqForm.question || !faqForm.answer || isSaving}
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-3xl font-black transition-all flex items-center gap-3 text-sm shadow-xl shadow-indigo-500/20 active:scale-95 hover:shadow-indigo-500/40"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 fill-white" />
                )}
                Commit Change
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
