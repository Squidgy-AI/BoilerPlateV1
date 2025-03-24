'use client';

import React, { useState } from 'react';
import Auth from './Auth';
import Chatbot from '../Chatbot';
import UserDashboard from '../UserDashboard';

const WelcomeScreen: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');

  const handleAuthenticated = (userId: string) => {
    setUserId(userId);
    setIsAuthenticated(true);
    // Generate initial session ID
    setCurrentSessionId(`${userId}_${Date.now()}`);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // You would also need to update Chatbot to load this session's history
  };

  const handleNewSession = () => {
    const newSessionId = `${userId}_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    // You would also need to update Chatbot to start a fresh session
  };

  // For the login view
  if (!isAuthenticated) {
    return (
      <div className="w-full h-screen bg-[#1B2431] flex items-center justify-center overflow-hidden">
        <Auth onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  // For the post-login view
  return (
    <div className="flex w-full h-screen overflow-hidden">
      <div className="w-[45%] bg-[#1B2431]">
        <UserDashboard 
          userId={userId}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />
      </div>
      <Chatbot 
        userId={userId} 
        sessionId={currentSessionId}
        onSessionChange={setCurrentSessionId}
      />
    </div>
  );
};

export default WelcomeScreen;