import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import UserProfile from './pages/UserProfile';
import { motion, AnimatePresence } from 'framer-motion';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-[#1E293B] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#00A859] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-white font-bold text-xl tracking-tight">Connecting to the Server...</h2>
          <p className="text-slate-400 text-sm mt-1">Verifying your secure session</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
};

function AppRoutes() {
  const { currentUser, userProfile, loading } = useAuth();

  // Robust redirection logic: if logged in but no unique name, force onboarding
  // We check this after loading is done.
  const needsOnboarding = currentUser && !userProfile?.uniqueName;

  if (loading) return null; // Let the AuthProvider's loading screen handle it

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={
          currentUser ? <Navigate to="/" /> : <Login />
        } />

        <Route path="/onboarding" element={
          <ProtectedRoute>
            {userProfile?.uniqueName ? <Navigate to="/" /> : <Onboarding />}
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            {needsOnboarding ? <Navigate to="/onboarding" /> : <UserProfile />}
          </ProtectedRoute>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            {needsOnboarding ? <Navigate to="/onboarding" /> : <Home />}
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
