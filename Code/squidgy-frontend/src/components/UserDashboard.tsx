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
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  userId, 
  currentSessionId,
  onSessionSelect,
  onNewSession
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedTopics] = useState([
    "Tell me about yourself",
    "What can you help me with?",
    "Tell me a fun fact",
    "How does AI work?"
  ]);

  // Mock function to load sessions - replace with actual API call
  useEffect(() => {
    const fetchSessions = async () => {
      // Mock data - replace with actual API call
      setTimeout(() => {
        const mockSessions = [
          {
            id: currentSessionId,
            createdAt: new Date(),
            name: "Current Session",
            messageCount: 0,
            lastActive: new Date()
          },
          {
            id: "prev_session_1",
            createdAt: new Date(Date.now() - 86400000),
            name: "Yesterday's Chat",
            messageCount: 24,
            lastActive: new Date(Date.now() - 86400000)
          }
        ];
        setSessions(mockSessions);
        setLoading(false);
      }, 500);
    };

    fetchSessions();
  }, [userId, currentSessionId]);

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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            New Chat
          </button>
        </div>

        {loading ? (
          <p>Loading sessions...</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
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
            ))}
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
              className="bg-[#2D3B4F] p-3 rounded-lg text-sm cursor-pointer hover:bg-[#374863]"
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