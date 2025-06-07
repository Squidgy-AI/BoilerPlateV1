// src/components/EnhancedChat.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import InteractiveAvatar from './InteractiveAvatar';
import { Mic, Video, MessageSquare, Send, X } from 'lucide-react';
import { processAgentResponse } from '../services/n8nService';
import ToolExecutionVisualizer from './ToolExecutionVisualizer';
import { AGENT_CONFIG, getAgentById } from '@/config/agents';

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  timestamp: string;
  sender_name?: string;
  is_agent?: boolean;
  agent_type?: string;
}

interface EnhancedChatProps {
  sessionId: string;
  isGroup?: boolean;
  onNewSession: () => void;
}

const EnhancedChat: React.FC<EnhancedChatProps> = ({ 
  sessionId,
  isGroup = false,
  onNewSession
}) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [textEnabled, setTextEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [agentType, setAgentType] = useState<string | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState('Anna_public_3_20240108');
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<any>(null);
  
  // Websocket connection for real-time updates
  const websocketRef = useRef<WebSocket | null>(null);
  const [websocketStatus, setWebsocketStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // All available agents
  const availableAgents = AGENT_CONFIG;
  
  // Connect WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      if (!profile) return;
      
      const wsBase = process.env.NEXT_PUBLIC_API_BASE;
      const wsUrl = `wss://${wsBase}/ws/${profile.id}/${sessionId}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        setWebsocketStatus('connecting');
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setWebsocketStatus('connected');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
            
            switch (data.type) {
              case 'agent_thinking':
                setAgentThinking(`${data.agent} is thinking...`);
                break;
                
              case 'agent_response':
                if (data.final) {
                  setAgentThinking(null);
                  
                  // Add message to chat
                  const newAgentMessage: ChatMessage = {
                    id: `agent-${Date.now()}`,
                    sender_id: agentType || 'AI',
                    recipient_id: profile.id,
                    message: data.message,
                    timestamp: new Date().toISOString(),
                    sender_name: getAgentName(agentType),
                    is_agent: true,
                    agent_type: agentType
                  };
                  
                  setMessages(prev => [...prev, newAgentMessage]);
                  
                  // Send to n8n for processing
                  if (agentType) {
                    processAgentResponse(data.message, agentType, sessionId);
                  }
                  
                  // Have avatar speak if enabled
                  if (avatarRef.current && videoEnabled && voiceEnabled) {
                    speakWithAvatar(data.message);
                  }
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setWebsocketStatus('disconnected');
          
          // Try to reconnect after a delay
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws.close();
        };
        
        websocketRef.current = ws;
        
        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setWebsocketStatus('disconnected');
        
        // Try to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [profile, sessionId]);
  
  // Load session details and messages
  useEffect(() => {
    if (!profile || !sessionId) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        if (isGroup) {
          // Fetch group details
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('id', sessionId)
            .single();
            
          if (groupError) throw groupError;
          
          setSessionDetails(groupData);
          
          // Fetch group members
          const { data: membersData, error: membersError } = await supabase
            .from('group_members')
            .select('user_id, role, is_agent, agent_type, profiles(full_name, avatar_url)')
            .eq('group_id', sessionId);
            
          if (membersError) throw membersError;
          
          const formattedMembers = membersData.map(member => ({
            id: member.user_id,
            name: member.profiles?.full_name || 'Unknown',
            avatar: member.profiles?.avatar_url || '',
            role: member.role,
            isAgent: member.is_agent,
            agentType: member.agent_type
          }));
          
          setGroupMembers(formattedMembers);
          
          // Fetch group messages
          const { data: messagesData, error: messagesError } = await supabase
            .from('group_messages')
            .select('*, sender:sender_id(full_name)')
            .eq('group_id', sessionId)
            .order('timestamp', { ascending: true });
            
          if (messagesError) throw messagesError;
          
          const formattedMessages = messagesData.map(msg => ({
            id: msg.id,
            sender_id: msg.sender_id,
            recipient_id: sessionId,
            message: msg.message,
            timestamp: msg.timestamp,
            sender_name: msg.sender?.full_name || 'Unknown',
            is_agent: msg.is_agent || false,
            agent_type: msg.agent_type
          }));
          
          setMessages(formattedMessages);
        } else {
          // Check if this is an agent session
          const agent = availableAgents.find(a => a.id === sessionId);
          
          if (agent) {
            setSessionDetails({
              id: agent.id,
              name: agent.name,
              avatar: agent.avatar
            });
            
            setAgentType(agent.type); 
            setSelectedAvatarId(agent.id); // Just pass the agent ID
            
            // No need to fetch messages for a new agent chat
            setMessages([]);
          } else {
            // Fetch regular chat with another user
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionId)
              .single();
              
            if (userError) throw userError;
            
            setSessionDetails(userData);
            
            // Fetch direct messages
            const { data: messagesData, error: messagesError } = await supabase
              .from('messages')
              .select('*')
              .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
              .or(`sender_id.eq.${sessionId},recipient_id.eq.${sessionId}`)
              .order('timestamp', { ascending: true });
              
            if (messagesError) throw messagesError;
            
            // Filter to only include messages between these two users
            const userMessages = messagesData.filter(msg => 
              (msg.sender_id === profile.id && msg.recipient_id === sessionId) ||
              (msg.sender_id === sessionId && msg.recipient_id === profile.id)
            );
            
            // Get sender names
            const senderIds = [...new Set(userMessages.map(msg => msg.sender_id))];
            const { data: senders } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', senderIds);
              
            const senderMap = senders?.reduce((acc, sender) => {
              acc[sender.id] = sender.full_name;
              return acc;
            }, {} as Record<string, string>) || {};
            
            const formattedMessages = userMessages.map(msg => ({
              ...msg,
              sender_name: senderMap[msg.sender_id] || 'Unknown'
            }));
            
            setMessages(formattedMessages);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [profile, sessionId, isGroup]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentThinking]);
  
  const getAgentName = (type: string | null): string => {
    if (!type) return 'AI';
    
    const agent = availableAgents.find(a => a.type === type);
    return agent ? agent.name : 'AI';
  };
  
  const sendMessage = async () => {
    if (!profile || !newMessage.trim() || !sessionId) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Create the message object
    const messageObj: Partial<ChatMessage> = {
      sender_id: profile.id,
      recipient_id: sessionId,
      message: messageText,
      timestamp: new Date().toISOString(),
      sender_name: profile.full_name
    };
    
    // Add message to local state immediately
    const tempId = `temp-${Date.now()}`;
    setMessages(prevMessages => [
      ...prevMessages, 
      { ...messageObj, id: tempId } as ChatMessage
    ]);
    
    try {
      let savedMessage;
      
      if (isGroup) {
        // Save to group_messages
        const { data, error } = await supabase
          .from('group_messages')
          .insert({
            group_id: sessionId,
            sender_id: profile.id,
            message: messageText,
            timestamp: messageObj.timestamp,
            is_agent: false
          })
          .select()
          .single();
          
        if (error) throw error;
        savedMessage = data;
      } else if (agentType) {
        // This is an agent chat, no need to save to database
        // Send message to agent via WebSocket
        if (websocketRef.current && websocketStatus === 'connected') {
          const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          websocketRef.current.send(JSON.stringify({
            message: messageText,
            requestId
          }));
          
          // Set thinking status
          setAgentThinking('Squidgy is thinking...');
        } else {
          throw new Error('WebSocket not connected');
        }
      } else {
        // Save to direct messages
        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: profile.id,
            recipient_id: sessionId,
            message: messageText,
            timestamp: messageObj.timestamp
          })
          .select()
          .single();
          
        if (error) throw error;
        savedMessage = data;
      }
      
      // Update the message in state with the saved ID
      if (savedMessage) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, id: savedMessage.id } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the temporary message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== tempId)
      );
    }
  };
  
  const speakWithAvatar = async (text: string) => {
    if (!avatarRef.current || !videoEnabled || !voiceEnabled) return;
    
    try {
      await avatarRef.current.speak({
        text: text,
        taskType: "REPEAT",
        taskMode: "SYNC"
      });
    } catch (error) {
      console.error("Avatar speak error:", error);
    }
  };
  
  const handleAvatarReady = () => {
    console.log("Avatar is ready");
    
    // If this is a new agent session, send an initial greeting
    if (agentType && messages.length === 0) {
      // Add a welcome message
      const initialMessage: ChatMessage = {
        id: `initial-${Date.now()}`,
        sender_id: agentType,
        recipient_id: profile?.id || '',
        message: `Hi! I'm ${getAgentName(agentType)}. How can I help you today?`,
        timestamp: new Date().toISOString(),
        sender_name: getAgentName(agentType),
        is_agent: true,
        agent_type: agentType
      };
      
      setMessages([initialMessage]);
      
      // Have avatar speak if enabled
      if (videoEnabled && voiceEnabled) {
        speakWithAvatar(initialMessage.message);
      }
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1E2A3B]">
      {/* Chat Header */}
      <div className="p-4 bg-[#2D3B4F] border-b border-gray-700 flex items-center">
        {sessionDetails ? (
          <>
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-600 mr-3">
              {sessionDetails.avatar_url || sessionDetails.avatar ? (
                  <img 
                    src={sessionDetails.avatar_url || sessionDetails.avatar} 
                    alt={sessionDetails.full_name || sessionDetails.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Find the agent and use its fallback
                      const agent = availableAgents.find(a => 
                        a.id === sessionId || a.type === sessionDetails.agent_type
                      );
                      target.src = agent?.fallbackAvatar || '/avatars/default-agent.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {(sessionDetails.full_name || sessionDetails.name || 'U').charAt(0)}
                  </div>
                )}
            </div>
            <div>
              <h2 className="font-semibold text-white">
                {sessionDetails.full_name || sessionDetails.name || 'Chat'}
              </h2>
              {isGroup && (
                <p className="text-xs text-gray-400">
                  {groupMembers.length} members
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="animate-pulse flex items-center">
            <div className="w-10 h-10 bg-gray-700 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        )}
        
        <div className="ml-auto flex space-x-3">
          {/* Toggle buttons for voice, video, text */}
          <button 
            onClick={() => setTextEnabled(!textEnabled)}
            className={`p-2 rounded-full ${textEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            title={textEnabled ? "Disable text" : "Enable text"}
          >
            <MessageSquare size={16} />
          </button>
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-full ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            title={voiceEnabled ? "Disable voice" : "Enable voice"}
          >
            <Mic size={16} />
          </button>
          <button 
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={`p-2 rounded-full ${videoEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            title={videoEnabled ? "Disable video" : "Enable video"}
          >
            <Video size={16} />
          </button>
        </div>
      </div>
      
      {/* Avatar Video Section */}
      {agentType && (
        <div className="relative h-[430px] mb-4">
          <InteractiveAvatar
            onAvatarReady={handleAvatarReady}
            avatarRef={avatarRef}
            enabled={videoEnabled}
            sessionId={sessionId}
            voiceEnabled={voiceEnabled}
            avatarId={selectedAvatarId}
          />
        </div>
      )}
      
      {/* Tool Execution Visualizer */}
      <ToolExecutionVisualizer
        websocket={websocketRef.current}
        currentRequestId={null}
        isProcessing={agentThinking !== null}
      />
      
      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto p-4 ${!textEnabled ? 'opacity-50' : ''}`}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>No messages yet.</p>
            <p>Start a conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender_id === profile?.id 
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : msg.is_agent
                        ? 'bg-purple-700 text-white rounded-bl-none' 
                        : 'bg-gray-700 text-white rounded-bl-none'
                  }`}
                >
                  {(isGroup || msg.is_agent) && msg.sender_id !== profile?.id && (
                    <div className="text-xs text-gray-300 mb-1">
                      {msg.sender_name || 'Unknown'}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.message}</div>
                  <div className="text-xs opacity-70 text-right mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Agent Thinking Indicator */}
            {agentThinking && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-800 text-white rounded-bl-none">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></div>
                    <span>{agentThinking}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end">
          <textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-[#2D3B4F] text-white rounded-lg resize-none p-3 min-h-[40px] max-h-[200px]"
            disabled={websocketStatus !== 'connected' && agentType !== null}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={websocketStatus !== 'connected' && agentType !== null}
            className={`ml-2 p-3 rounded-full ${
              websocketStatus === 'connected' || agentType === null
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-700'
            }`}
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
        
        {websocketStatus !== 'connected' && agentType !== null && (
          <div className="text-red-400 text-xs mt-2">
            Disconnected from server. Reconnecting...
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChat;