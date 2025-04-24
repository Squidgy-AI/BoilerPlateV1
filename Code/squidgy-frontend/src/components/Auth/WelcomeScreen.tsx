'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Auth from './Auth';
import Chatbot, { processingState, ChatProcessingState } from '../Chatbot';
import UserDashboard from '../UserDashboard';
// In your _app.jsx or page.jsx or layout.jsx
import '../../animations.css';

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
  
  // State to track WebSocket and processing state for the ThinkingProcess component
  const [chatProcessingState, setChatProcessingState] = useState<ChatProcessingState>({
    websocket: null,
    currentRequestId: null,
    isProcessing: false
  });
  
  // Set up periodic sync of processing state from Chatbot to WelcomeScreen
  useEffect(() => {
    // Function to update the local state with the exported processing state
    const syncProcessingState = () => {
      const newState = {
        websocket: processingState.websocket,
        currentRequestId: processingState.currentRequestId,
        isProcessing: processingState.isProcessing
      };
      
      // Only update state if there's an actual change to minimize re-renders
      if (newState.websocket !== chatProcessingState.websocket || 
          newState.currentRequestId !== chatProcessingState.currentRequestId ||
          newState.isProcessing !== chatProcessingState.isProcessing) {
        
        console.log("Processing state updated:", newState);
        setChatProcessingState(newState);
      }
    };
    
    // Initial sync
    syncProcessingState();
    
    // Set interval to check for updates - increase frequency for more responsive updates
    const intervalId = setInterval(syncProcessingState, 50);
    
    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [chatProcessingState]);
  
  // Function to fetch session data including website info
  const fetchSessionData = useCallback(async (sessionId: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE;
      const response = await fetch(`https://${apiBase}/chat-history?session_id=${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched chat history:", data);
    
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
      }, 3000);
      
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

  // For the post-login view with coordinated components
  return (
    <div className="flex w-full h-screen overflow-hidden relative">
      {/* Left side - User Dashboard with ThinkingProcess */}
      <div className="w-[45%] bg-[#1B2431]">
        <UserDashboard 
          userId={userId}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onTopicSelect={handleTopicSelect}
          websiteData={websiteData}
          // Pass WebSocket and processing state to UserDashboard
          websocket={chatProcessingState.websocket}
          currentRequestId={chatProcessingState.currentRequestId}
          isProcessing={chatProcessingState.isProcessing}
        />
      </div>
      
      {/* Right side - Chatbot */}
      <Chatbot 
        userId={userId} 
        sessionId={currentSessionId}
        onSessionChange={setCurrentSessionId}
        initialTopic={suggestedTopic}
        key={currentSessionId} // Force re-mount when session changes
      />
      
      {/* Debugging indicator (optional, can be removed in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 left-2 text-xs text-gray-500 bg-black bg-opacity-70 p-1 rounded">
          Session: {currentSessionId.substring(0, 8)}...
          {chatProcessingState.isProcessing && 
            ` | Processing: ${chatProcessingState.currentRequestId?.substring(0, 8)}...`}
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;