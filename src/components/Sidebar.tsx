import React, { useState } from 'react';
import { 
  MessageSquare, Plus, LogOut, Database, 
  LayoutDashboard, Trash2, ChevronLeft, ChevronRight, 
  Shield
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import ThemeToggle from './ThemeToggle';

interface ChatHistoryItem {
  _id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  picture?: string;
  avatar?: string;
}

interface SidebarProps {
  chats: ChatHistoryItem[];
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId: string | null;
  user?: User | null;
  onLogout?: () => void;
  onDeleteChat?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  chats, 
  onSelectChat, 
  onNewChat, 
  currentChatId, 
  user, 
  onLogout, 
  onDeleteChat 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare, path: '/' },
    { id: 'upload', label: 'Knowledge Base', icon: Database, path: '/upload' },
    { id: 'admin', label: 'Admin Panel', icon: Shield, path: '/admin' },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 320 }}
      className="h-screen glass-heavy border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col relative z-20 transition-colors"
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-50 text-slate-500 dark:text-slate-400"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Header */}
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 min-w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-900 dark:text-white font-bold text-xl tracking-tight"
          >
            SupportAI
          </motion.h1>
        )}
      </div>

      {/* Global Navigation */}
      <div className="px-3 py-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.id} 
              to={item.path}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 min-w-5 transition-transform group-hover:scale-110",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-500"
              )} />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isActive && !isCollapsed && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="h-[1px] bg-slate-200/50 dark:bg-slate-800/50 mx-6 my-4" />

      {/* Main Action */}
      <div className="px-4 mb-6">
        <button 
          onClick={onNewChat}
          className={cn(
            "w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]",
            isCollapsed ? "h-12 w-12 rounded-xl" : "py-3 px-4 rounded-xl"
          )}
        >
          <Plus className="w-5 h-5" />
          {!isCollapsed && <span>New Session</span>}
        </button>
      </div>

      {/* History Section */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar mask-fade">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Recent Activity</span>
          </div>
          <AnimatePresence>
            {chats.length === 0 ? (
               <div className="text-center text-xs text-slate-400 py-8 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                 No recent chats yet.
               </div>
            ) : (
              chats.map((chat) => (
                <motion.div 
                  key={chat._id} 
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative group/item"
                >
                  <button
                    onClick={() => onSelectChat(chat._id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all border group pr-10",
                      currentChatId === chat._id
                        ? "bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/30 shadow-sm" 
                        : "border-transparent hover:bg-white/50 dark:hover:bg-slate-800/30"
                    )}
                  >
                    <div className="flex justify-between items-start mb-0.5 gap-2">
                      <span className={cn(
                        "text-xs font-semibold truncate transition-colors",
                        currentChatId === chat._id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 group-hover:text-indigo-500"
                      )}>
                        {chat.title || "Untitled Chat"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate line-clamp-1">
                      {chat.lastMessage || "Empty session..."}
                    </p>
                  </button>
                  
                  {onDeleteChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Archive this conversation?')) {
                          onDeleteChat(chat._id);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all hover:scale-110"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* User Footer */}
      <div className="p-4 mt-auto">
        <div className={cn(
          "glass p-2 rounded-2xl flex items-center transition-all",
          isCollapsed ? "flex-col gap-3" : "gap-3"
        )}>
          {/* Avatar Area */}
          <div className="relative">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider truncate">Pro Member</p>
            </div>
          )}

          <div className={cn("flex items-center", isCollapsed ? "flex-col gap-1" : "gap-1")}>
            <ThemeToggle />
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors group"
                title="Logout"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
