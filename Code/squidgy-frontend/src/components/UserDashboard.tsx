'use client';

import React, { useEffect, useState } from 'react';

interface Session {
  id: string;
  createdAt: Date;
  name: string;
  messageCount: number;
  lastActive: Date;
}



interface UserDashboardProps {
  userId: string;
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onTopicSelect: (topic: string) => void; // New prop
}



const UserDashboard: React.FC<UserDashboardProps> = ({ 
  userId, 
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onTopicSelect
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedTopics] = useState([
    "What can Squidgy do for my business?",
    "How can you analyze my website?",
    "Set up a consultation appointment",
    "Help with social media strategy"
  ]);

  // Function to load sessions from API
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        // API base URL - should match the one used in Chatbot component
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || '20.236.251.118';
        const response = await fetch(`http://${apiBase}/chat-history?session_id=${currentSessionId}`);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process sessions data
        // For now, we'll just ensure the current session is in the list
        let sessionsList = sessions.filter(s => s.id !== currentSessionId);
        
        // Add current session with message count from history
        sessionsList.unshift({
          id: currentSessionId,
          createdAt: new Date(),
          name: formatSessionName(currentSessionId),
          messageCount: data?.history?.length || 0,
          lastActive: new Date()
        });
        
        // Limit to 10 most recent sessions
        sessionsList = sessionsList.slice(0, 10);
        
        setSessions(sessionsList);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        // Ensure current session exists even if API call fails
        if (!sessions.some(s => s.id === currentSessionId)) {
          setSessions([{
            id: currentSessionId,
            createdAt: new Date(),
            name: formatSessionName(currentSessionId),
            messageCount: 0,
            lastActive: new Date()
          }, ...sessions]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [currentSessionId]);

  // Function to format session name from ID
  const formatSessionName = (id: string): string => {
    // Extract date part from session ID if it follows userId_timestamp format
    if (id.includes('_')) {
      const timestamp = id.split('_')[1];
      if (!isNaN(Number(timestamp))) {
        const date = new Date(Number(timestamp));
        return `Chat on ${date.toLocaleDateString()}`;
      }
    }
    return "New Conversation";
  };

  // Handle suggested topic click
  const handleTopicClick = (topic: string) => {
    // Forward the topic to the parent through onTopicSelect
    onTopicSelect(topic);
    
    // No need to call onNewSession() here as it's handled by the parent in handleTopicSelect
    console.log("Selected topic:", topic);
  };

  return (
    <div className="w-full h-full bg-[#1B2431] text-white flex flex-col p-8">
      {/* User Profile Section */}
      <div className="mb-10 text-center">
        <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-3xl">{userId.charAt(0).toUpperCase()}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-wide mb-2">
          HI {userId.toUpperCase()}
        </h1>
        <p className="text-xl text-gray-400">Welcome to Squidgy</p>
      </div>

      {/* Sessions Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Conversations</h2>
          <button 
            onClick={onNewSession}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            New Chat
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {sessions.length > 0 ? (
              sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    session.id === currentSessionId 
                      ? "bg-blue-700" 
                      : "bg-[#2D3B4F] hover:bg-[#374863]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{session.name}</p>
                    <span className="text-xs text-gray-400">
                      {session.messageCount} messages
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {session.lastActive.toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                No conversations yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested Topics */}
      <div className="mt-auto">
        <h2 className="text-xl font-bold mb-4">Suggested Topics</h2>
        <div className="grid grid-cols-2 gap-2">
          {suggestedTopics.map((topic, index) => (
            <div 
              key={index}
              onClick={() => handleTopicClick(topic)}
              className="bg-[#2D3B4F] p-3 rounded-lg text-sm cursor-pointer hover:bg-[#374863] transition-colors"
            >
              {topic}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;