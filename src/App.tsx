import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import ChatApp from './ChatApp';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import KnowledgeBase from './components/KnowledgeBase';
import UserDashboard from './components/UserDashboard';
import Layout from './components/Layout';

// Replace with your Google OAuth Client ID from https://console.cloud.google.com
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '863379789902-fa455rs1s1smppabbdqob0h7ca0612b5.apps.googleusercontent.com';

function App() {
  const location = useLocation();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChatApp />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Layout>
                    <KnowledgeBase />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin" 
              element={
                <Layout>
                  <AdminDashboard />
                </Layout>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
