'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Auth from './Auth';
import Chatbot from '../Chatbot';
import UserDashboard from '../UserDashboard';

// Interface for suggested topics that can be passed to the Chatbot
interface SuggestedTopic {
  text: string;
  selected: boolean;
}

const WelcomeScreen: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [suggestedTopic, setSuggestedTopic] = useState<string | null>(null);
  
  // Effect to retrieve previous authentication from localStorage (if available)
  useEffect(() => {
    const savedUserId = localStorage.getItem('squidgy_user_id');
    const savedSessionId = localStorage.getItem('squidgy_session_id');
    
    if (savedUserId) {
      setUserId(savedUserId);
      setIsAuthenticated(true);
      
      if (savedSessionId) {
        setCurrentSessionId(savedSessionId);
      } else {
        // Create a new session if user is authenticated but no session exists
        const newSessionId = `${savedUserId}_${Date.now()}`;
        setCurrentSessionId(newSessionId);
        localStorage.setItem('squidgy_session_id', newSessionId);
      }
    }
  }, []);

  const handleAuthenticated = useCallback((newUserId: string) => {
    setUserId(newUserId);
    setIsAuthenticated(true);
    
    // Save to localStorage for persistence
    localStorage.setItem('squidgy_user_id', newUserId);
    
    // Generate initial session ID
    const newSessionId = `${newUserId}_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    localStorage.setItem('squidgy_session_id', newSessionId);
  }, []);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem('squidgy_session_id', sessionId);
    // Clear any selected topic when switching sessions
    setSuggestedTopic(null);
  }, []);

  const handleNewSession = useCallback(() => {
    const newSessionId = `${userId}_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    localStorage.setItem('squidgy_session_id', newSessionId);
    // Clear any selected topic when creating a new session
    setSuggestedTopic(null);
  }, [userId]);
  
  const handleTopicSelect = useCallback((topic: string) => {
    setSuggestedTopic(topic);
    // Create a new session for this topic
    handleNewSession();
  }, [handleNewSession]);
  
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setUserId('');
    setCurrentSessionId('');
    setSuggestedTopic(null);
    
    // Clear localStorage
    localStorage.removeItem('squidgy_user_id');
    localStorage.removeItem('squidgy_session_id');
  }, []);

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
    <div className="flex w-full h-screen overflow-hidden relative">
      {/* Logout button in the top-right corner */}
      <button 
        onClick={handleLogout}
        className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Logout
      </button>
      
      <div className="w-[45%] bg-[#1B2431]">
        <UserDashboard 
          userId={userId}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onTopicSelect={handleTopicSelect}
        />
      </div>
      
      <Chatbot 
        userId={userId} 
        sessionId={currentSessionId}
        onSessionChange={setCurrentSessionId}
        initialTopic={suggestedTopic}
        key={currentSessionId} // Force re-mount when session changes
      />
    </div>
  );
};

export default WelcomeScreen;