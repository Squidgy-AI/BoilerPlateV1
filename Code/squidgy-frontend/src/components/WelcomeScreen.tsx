// src/components/WelcomeScreen.tsx
'use client';

import React from 'react';
import { AuthProvider, useAuth } from './Auth/AuthProvider';
import EnhancedLoginForm from './Auth/EnhancedLoginForm';
import EnhancedDashboard from './Dashboard/EnhancedDashboard';

const WelcomeScreenContent: React.FC = () => {
  const { profile, isLoading } = useAuth();
  
  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1B2431] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // If not authenticated, show login form
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#1B2431] flex items-center justify-center p-4">
        <EnhancedLoginForm />
      </div>
    );
  }
  
  // If authenticated, show the enhanced dashboard
  return <EnhancedDashboard />;
};

// Wrap the component with AuthProvider
const WelcomeScreen: React.FC = () => {
  return (
    <AuthProvider>
      <WelcomeScreenContent />
    </AuthProvider>
  );
};

export default WelcomeScreen;