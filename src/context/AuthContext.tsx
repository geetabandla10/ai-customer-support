import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  _id: string;
  name: string;
  email: string;
  picture?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('support_ai_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem('support_ai_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('support_ai_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('support_ai_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
