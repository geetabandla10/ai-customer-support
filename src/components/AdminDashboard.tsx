import React, { useState, useEffect } from 'react';
import { MessageSquare, HelpCircle, Trash2, Edit2, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
}

interface UserChat {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
  };
  title: string;
  lastMessage: string;
  updatedAt: string;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'chats' | 'faqs'>('chats');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [chats, setChats] = useState<UserChat[]>([]);
  
  // FAQ Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });

  useEffect(() => {
    if (activeTab === 'faqs') {
      fetchFaqs();
    } else {
      fetchChats();
    }
  }, [activeTab]);

  const fetchFaqs = async () => {
    try {
      const res = await fetch('/api/faqs');
      const data = await res.json();
      setFaqs(data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/admin/chats');
      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const handleSaveFaq = async () => {
    try {
      if (editingFaq) {
        await fetch(`/api/faqs/${editingFaq._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(faqForm),
        });
      } else {
        await fetch('/api/faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(faqForm),
        });
      }
      setIsModalOpen(false);
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '' });
      fetchFaqs();
    } catch (err) {
      console.error('Error saving FAQ:', err);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      if (!confirm('Are you sure you want to delete this FAQ?')) return;
      await fetch(`/api/faqs/${id}`, { method: 'DELETE' });
      fetchFaqs();
    } catch (err) {
      console.error('Error deleting FAQ:', err);
    }
  };

  const openModalForEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({ question: faq.question, answer: faq.answer });
    setIsModalOpen(true);
  };

  const openModalForNew = () => {
    setEditingFaq(null);
    setFaqForm({ question: '', answer: '' });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Manage support platform</p>
        </div>
        <Link 
          to="/"
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          &larr; Back to App
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-8">
        
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> User Chats
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'faqs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Manage FAQs
          </button>
        </div>

        {/* Chats Tab */}
        {activeTab === 'chats' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                  <th className="p-4">User</th>
                  <th className="p-4">Chat Title</th>
                  <th className="p-4 hidden md:table-cell">Last Message</th>
                  <th className="p-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {chats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-500">No chats found.</td>
                  </tr>
                ) : (
                  chats.map((chat) => (
                    <tr key={chat._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                            {chat.userId?.avatar || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{chat.userId?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{chat.userId?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{chat.title}</td>
                      <td className="p-4 text-slate-500 hidden md:table-cell truncate max-w-[200px]" title={chat.lastMessage}>
                        {chat.lastMessage}
                      </td>
                      <td className="p-4 text-slate-400 whitespace-nowrap">
                        {new Date(chat.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <div>
            <div className="flex justify-end mb-4">
              <button 
                onClick={openModalForNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add New FAQ
              </button>
            </div>
            
            <div className="grid gap-4">
              {faqs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500">
                  No FAQs added yet.
                </div>
              ) : (
                faqs.map((faq) => (
                  <div key={faq._id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start gap-4 hover:shadow-md transition-shadow">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg mb-2">{faq.question}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => openModalForEdit(faq)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteFaq(faq._id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* FAQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                <input 
                  type="text" 
                  value={faqForm.question}
                  onChange={e => setFaqForm({...faqForm, question: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-sm outline-none transition-all"
                  placeholder="E.g., How do I reset my password?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Answer</label>
                <textarea 
                  value={faqForm.answer}
                  onChange={e => setFaqForm({...faqForm, answer: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-sm outline-none transition-all resize-none"
                  placeholder="E.g., You can reset your password by clicking on..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFaq}
                disabled={!faqForm.question || !faqForm.answer}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                Save FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
