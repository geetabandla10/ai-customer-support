import React from 'react';
import { MessageSquare, Plus, Search, Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

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
}

const Sidebar: React.FC<SidebarProps> = ({ chats, onSelectChat, onNewChat, currentChatId, user, onLogout }) => {
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="w-80 h-full bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <h1 className="text-white font-bold text-xl flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          SupportAI
        </h1>
        <Link to="/admin" className="p-2 hover:bg-slate-800 rounded-lg transition-colors" title="Admin Dashboard">
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search history..."
            className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        <div className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Chats</div>
        {chats.length === 0 ? (
           <div className="text-center text-xs text-slate-500 p-4">No recent chats.</div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat._id}
              onClick={() => onSelectChat(chat._id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all border",
                currentChatId === chat._id
                  ? "bg-slate-800 border-slate-700" 
                  : "border-transparent hover:bg-slate-800/50 group hover:border-slate-700"
              )}
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <span className={cn(
                  "text-sm font-medium transition-colors truncate",
                  currentChatId === chat._id ? "text-blue-400" : "text-slate-200 group-hover:text-blue-400"
                )}>
                  {chat.title || "New Chat"}
                </span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                  {new Date(chat.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
            </button>
          ))
        )}
      </div>

      {/* User Profile + Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          {/* Avatar */}
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-10 h-10 rounded-full ring-2 ring-slate-700 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-slate-700">
              {initials}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Guest'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
