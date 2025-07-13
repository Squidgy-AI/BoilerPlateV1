// src/components/ChatHistory.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare, User, Bot, Download, Search } from 'lucide-react';
import { useAuth } from './Auth/AuthProvider';
import MessageContent from './Chat/MessageContent';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
}

interface ChatSession {
  session_id: string;
  agent_id: string;
  agent_name: string;
  last_active: string;
  message_count: number;
  first_message?: string;
  avatar_url?: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  agent_id: string;
  sender: 'user' | 'agent';
  message: string;
  timestamp: string;
  agent_name?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ isOpen, onClose, agentId }) => {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && profile) {
      loadChatSessions();
    }
  }, [isOpen, profile, agentId]);

  const loadChatSessions = async () => {
    if (!profile) return;

    try {
      setIsLoading(true);
      
      // Get user_id from profiles table
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        return;
      }

      // Query chat history to get unique sessions with message counts and latest messages
      console.log('🔍 Querying chat_history for user_id:', userIdResult.user_id);
      
      const { data: sessionData, error } = await supabase
        .from('chat_history')
        .select(`
          session_id,
          agent_id,
          agent_name,
          timestamp,
          message,
          sender
        `)
        .eq('user_id', userIdResult.user_id)
        .order('timestamp', { ascending: false });
        
      console.log('📊 Chat history query result:', { 
        dataCount: sessionData?.length || 0, 
        error: error?.message,
        sampleData: sessionData?.slice(0, 2)
      });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      // Group by session_id and agent_id to create session summaries
      const sessionsMap = new Map<string, ChatSession>();
      
      (sessionData || []).forEach(msg => {
        const sessionKey = `${msg.session_id}_${msg.agent_id}`;
        
        if (!sessionsMap.has(sessionKey)) {
          // Get agent name from message or use agent_id as fallback
          let agentName = msg.agent_name || msg.agent_id;
          if (msg.agent_id === 'PersonalAssistant') {
            agentName = 'Personal Assistant Bot';
          } else if (msg.agent_id === 'SOLAgent') {
            agentName = 'Solar Sales Specialist';
          }

          sessionsMap.set(sessionKey, {
            session_id: msg.session_id,
            agent_id: msg.agent_id,
            agent_name: agentName,
            last_active: msg.timestamp,
            message_count: 1,
            first_message: msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message,
            avatar_url: `/avatars/${msg.agent_id}.jpg`
          });
        } else {
          // Update message count and keep the latest timestamp
          const session = sessionsMap.get(sessionKey)!;
          session.message_count += 1;
          
          // Keep the most recent timestamp as last_active
          if (new Date(msg.timestamp) > new Date(session.last_active)) {
            session.last_active = msg.timestamp;
          }
        }
      });

      // Convert map to array and sort by last_active
      const sessions = Array.from(sessionsMap.values())
        .sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());

      // Filter by agentId if specified
      const filteredSessions = agentId 
        ? sessions.filter(session => session.agent_id === agentId)
        : sessions;

      setSessions(filteredSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionMessages = async (session: ChatSession) => {
    try {
      setIsLoading(true);
      setSelectedSession(session);

      // Get user_id from profiles table
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        return;
      }

      // Query chat history for this specific session and agent
      const { data, error } = await supabase
        .from('chat_history')
        .select(`
          id,
          user_id,
          session_id,
          agent_id,
          sender,
          message,
          timestamp,
          agent_name
        `)
        .eq('user_id', userIdResult.user_id)
        .eq('session_id', session.session_id)
        .eq('agent_id', session.agent_id)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading session messages:', error);
        return;
      }

      // Transform data to match our interface
      const formattedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        session_id: msg.session_id,
        agent_id: msg.agent_id,
        sender: msg.sender as 'user' | 'agent',
        message: msg.message,
        timestamp: msg.timestamp,
        agent_name: msg.agent_name
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading session messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportChatHistory = () => {
    if (!selectedSession || !messages.length) return;

    const chatData = {
      session: selectedSession,
      messages: messages,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${selectedSession.agent_name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = sessions.filter(session =>
    session.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.first_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[80vh] flex overflow-hidden">
        {/* Sessions List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Chat History</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading sessions...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No sessions match your search' : 'No chat history available'}
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={`${session.session_id}_${session.agent_id}`}
                  onClick={() => loadSessionMessages(session)}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedSession?.session_id === session.session_id && selectedSession?.agent_id === session.agent_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <Bot size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{session.agent_name}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(session.last_active).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {session.first_message && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {session.first_message}
                    </p>
                  )}
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <MessageSquare size={12} className="mr-1" />
                    {session.message_count} message{session.message_count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages View */}
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedSession.agent_name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedSession.last_active).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={exportChatHistory}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">No messages in this session</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      <div className={`inline-block p-3 rounded-2xl max-w-[80%] ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                      }`}>
                        <MessageContent 
                          text={message.message} 
                          isUser={message.sender === 'user'}
                        />
                      </div>
                      <div className={`text-xs text-gray-500 mt-1 ${
                        message.sender === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {new Date(message.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a session to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;