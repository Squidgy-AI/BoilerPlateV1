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

// AuthProvider is now in root layout, so just export the content directly
export default WelcomeScreenContent;