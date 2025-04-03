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

// Interface for website data
interface WebsiteData {
  url?: string;
  favicon?: string;
  screenshot?: string;
}

const WelcomeScreen: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [suggestedTopic, setSuggestedTopic] = useState<string | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  
  // Function to fetch session data including website info
  // Update the fetchSessionData function
const fetchSessionData = useCallback(async (sessionId: string) => {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || '127.0.0.1:8080';
    const response = await fetch(`http://${apiBase}/chat-history?session_id=${sessionId}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.websiteData) {
        setWebsiteData(data.websiteData);
      } else {
        setWebsiteData(null);
      }
    }
  } catch (error) {
    console.error("Error fetching session data:", error);
  }
}, []);
  
  // Effect to retrieve previous authentication from localStorage (if available)
  useEffect(() => {
    const savedUserId = localStorage.getItem('squidgy_user_id');
    const savedSessionId = localStorage.getItem('squidgy_session_id');
    
    if (savedUserId) {
      setUserId(savedUserId);
      setIsAuthenticated(true);
      
      if (savedSessionId) {
        setCurrentSessionId(savedSessionId);
        fetchSessionData(savedSessionId); // Fetch session data for existing session
      } else {
        // Create a new session if user is authenticated but no session exists
        const newSessionId = `${savedUserId}_${Date.now()}`;
        setCurrentSessionId(newSessionId);
        localStorage.setItem('squidgy_session_id', newSessionId);
      }
    }
  }, [fetchSessionData]);

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
    // Fetch session data for the selected session
    fetchSessionData(sessionId);
  }, [fetchSessionData]);

  const handleNewSession = useCallback(() => {
    const newSessionId = `${userId}_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    localStorage.setItem('squidgy_session_id', newSessionId);
    // Clear any selected topic and website data when creating a new session
    setSuggestedTopic(null);
    setWebsiteData(null);
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
    setWebsiteData(null);
    
    // Clear localStorage
    localStorage.removeItem('squidgy_user_id');
    localStorage.removeItem('squidgy_session_id');
  }, []);

  // Set up a periodic refresh of website data
  useEffect(() => {
    if (currentSessionId) {
      // Initial fetch
      fetchSessionData(currentSessionId);
      
      // Set up interval to refresh data every 30 seconds
      const intervalId = setInterval(() => {
        fetchSessionData(currentSessionId);
      }, 30000);
      
      // Clean up interval on component unmount or when session changes
      return () => clearInterval(intervalId);
    }
  }, [currentSessionId, fetchSessionData]);

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
      
      <div className="w-[45%] bg-[#1B2431]">
        <UserDashboard 
          userId={userId}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onTopicSelect={handleTopicSelect}
          websiteData={websiteData}
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