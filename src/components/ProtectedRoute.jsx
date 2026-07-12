import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#1F2937] text-white font-mono p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Animated Spinner */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          <div className="text-sm tracking-widest text-gray-400">CONNECTING TO TRANSITOPS SECURE PORTAL...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
