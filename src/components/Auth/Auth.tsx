'use client';

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

interface AuthProps {
  onAuthenticated: (userId: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-[#1E2A3B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm 
            onLoginSuccess={onAuthenticated} 
          />
        ) : (
          <SignupForm 
            onSignupSuccess={onAuthenticated}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
        
        {isLogin && (
          <div className="text-center mt-4 text-gray-300">
            Don't have an account?{' '}
            <button 
              onClick={() => setIsLogin(false)}
              className="text-blue-400 hover:underline"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;