// src/context/ChatContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import WebSocketService from '@/services/WebSocketService';

// Define types for messages, sessions, and other data
export interface ChatMessage {
  id: string;
  sender: string; 
  message: string;
  timestamp: string;
  requestId?: string;
  status?: 'complete' | 'thinking' | 'error';
  is_agent?: boolean;
  agent_type?: string;
}

interface WebsiteData {
  url?: string;
  screenshot?: string;
  favicon?: string;
  analysis?: string;
}

interface SolarResult {
  id: string;
  timestamp: number;
  address: string;
  type: 'insights' | 'datalayers' | 'report';
  data: any;
}

// Define the context interface
interface ChatContextType {
  currentSessionId: string;
  setCurrentSessionId: (id: string) => void;
  isGroupSession: boolean;
  setIsGroupSession: (isGroup: boolean) => void;
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  agentThinking: string | null;
  currentRequestId: string | null;
  websiteData: WebsiteData;
  solarResults: SolarResult[];
  websocket: WebSocketService | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  // UI preferences
  textEnabled: boolean;
  setTextEnabled: (enabled: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  videoEnabled: boolean;
  setVideoEnabled: (enabled: boolean) => void;
  selectedAvatarId: string;
  setSelectedAvatarId: (id: string) => void;
  
  // Session management
  createNewSession: () => Promise<string>;
  fetchSessionMessages: (sessionId: string, isGroup: boolean) => Promise<void>;
  clearSessionMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isGroupSession, setIsGroupSession] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData>({});
  const [solarResults, setSolarResults] = useState<SolarResult[]>([]);
  const [websocket, setWebsocket] = useState<WebSocketService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // UI preferences
  const [textEnabled, setTextEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('Anna_public_3_20240108');
  
  // Track message timeouts
  const messageTimeoutsRef = useRef<{[key: string]: NodeJS.Timeout}>({});

  // Initialize WebSocket when session changes
  useEffect(() => {
    if (!profile || !currentSessionId) return;
    
    // Clean up existing WebSocket
    if (websocket) {
      websocket.close();
    }
    
    // Clear any pending timeouts
    Object.values(messageTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
    messageTimeoutsRef.current = {};
    
    // Create new WebSocket service
    const wsService = new WebSocketService({
      userId: profile.user_id,
      sessionId: currentSessionId,
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onMessage: handleWebSocketMessage
    });
    
    // Connect to WebSocket server
    wsService.connect().catch((error) => {
      console.error('Error connecting to WebSocket:', error);
    });
    
    setWebsocket(wsService);
    
    // Reset chat state
    setAgentThinking(null);
    setCurrentRequestId(null);
    setWebsiteData({});
    setSolarResults([]);
    
    // Clean up on unmount
    return () => {
      if (wsService) {
        wsService.close();
      }
    };
  }, [profile, currentSessionId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket message:', data);
    
    switch (data.type) {
      case 'ack':
        // Acknowledgment of message receipt
        console.log(`Request ${data.requestId} acknowledged`);
        break;
        
      case 'processing_start':
        // Agents have started processing
        setIsProcessing(true);
        setAgentThinking('Squidgy is thinking...');
        break;
        
      case 'agent_thinking':
        // Update which agent is currently thinking
        setIsProcessing(true);
        setAgentThinking(`${data.agent} is thinking...`);
        break;
        
      case 'agent_update':
        // Update from an agent during processing
        setAgentThinking(`${data.agent}: ${data.message}`);
        break;
        
      case 'agent_response':
        // Final response from the agent
        if (data.final === true) {
          setIsProcessing(false);
          setAgentThinking(null);
          
          // Clear message timeout if it exists
          if (data.requestId && messageTimeoutsRef.current[data.requestId]) {
            clearTimeout(messageTimeoutsRef.current[data.requestId]);
            delete messageTimeoutsRef.current[data.requestId];
          }
          
          // Clear current request ID when complete
          if (currentRequestId === data.requestId) {
            setCurrentRequestId(null);
          }
          
          // Only add the AI response to chat history if text is enabled
          if (textEnabled) {
            const newMessage: ChatMessage = {
              id: `ai-${Date.now()}`,
              sender: data.agent || 'AI',
              message: data.message,
              timestamp: new Date().toISOString(),
              requestId: data.requestId,
              status: 'complete',
              is_agent: true,
              agent_type: data.agent
            };
            
            setMessages(prev => [
              ...prev.filter(msg => !(msg.requestId === data.requestId && msg.sender === 'AI')),
              newMessage
            ]);
            
            // Save message to database
            saveMessageToDatabase(newMessage);
            
            // Send to n8n for processing
            sendToN8n(data.agent, data.message);
          }
        }
        break;
        
      case 'tool_execution':
        handleToolExecution(data);
        break;
        
      case 'tool_result':
        handleToolResult(data);
        break;
    }
  };
  
  // Handle tool execution events
  const handleToolExecution = (data: any) => {
    if (data.tool === 'analyze_with_perplexity' || 
        data.tool === 'capture_website_screenshot' || 
        data.tool === 'get_website_favicon') {
      
      // Extract URL from tool parameters if available
      if (data.params?.url) {
        setWebsiteData(prev => ({
          ...prev,
          url: data.params.url
        }));
      }
    }
  };
  
  // Handle tool result events
  const handleToolResult = (data: any) => {
    // Extract tool name from executionId if not provided directly
    const toolName = data.tool || (data.executionId ? data.executionId.split('-')[0] : null);
    
    if (!toolName) return;
    
    switch (toolName) {
      case 'analyze_with_perplexity':
      case 'perplexity':
        if (data.result?.analysis) {
          setWebsiteData(prev => ({
            ...prev,
            analysis: data.result.analysis
          }));
        }
        break;
        
      case 'capture_website_screenshot':
      case 'screenshot':
        if (data.result?.path) {
          const path = processImagePath(data.result.path, 'screenshot');
          setWebsiteData(prev => ({
            ...prev,
            screenshot: path
          }));
        }
        break;
        
      case 'get_website_favicon':
      case 'favicon':
        if (data.result?.path) {
          const path = processImagePath(data.result.path, 'favicon');
          setWebsiteData(prev => ({
            ...prev,
            favicon: path
          }));
        }
        break;
        
      case 'get_insights':
      case 'insights':
        addSolarResult('insights', data);
        break;
        
      case 'get_datalayers':
      case 'datalayers':
        addSolarResult('datalayers', data);
        break;
        
      case 'get_report':
      case 'report':
        addSolarResult('report', data);
        break;
    }
  };
  
  // Add a solar result to the list
  const addSolarResult = (type: 'insights' | 'datalayers' | 'report', data: any) => {
    const address = data.params?.address || 'Unknown Address';
    
    setSolarResults(prev => [{
      id: data.executionId || `${type}-${Date.now()}`,
      address,
      type,
      timestamp: Date.now(),
      data: data.result
    }, ...prev].slice(0, 10)); // Keep only latest 10 results
  };
  
  // Process image paths to ensure they're properly formatted
  const processImagePath = (path: string, type: 'screenshot' | 'favicon'): string => {
    if (!path) return '';
    
    // If already a full URL, return as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Get the API base from env
    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    
    // If path already includes the static directory
    if (path.startsWith('/static/')) {
      return `https://${apiBase}${path}`;
    }
    
    // Extract filename if path contains directories
    const filename = path.includes('/') ? path.split('/').pop() : path;
    
    // Return full path based on type
    if (type === 'screenshot') {
      return `https://${apiBase}/static/screenshots/${filename}`;
    } else {
      return `https://${apiBase}/static/favicons/${filename}`;
    }
  };
  
  // Send a message to n8n
  const sendToN8n = async (agent: string, message: string) => {
    const n8nEndpoint = process.env.NEXT_PUBLIC_N8N_ENDPOINT;
    if (!n8nEndpoint) return;
    
    try {
      await fetch(n8nEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent,
          message,
          sessionId: currentSessionId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error sending to n8n:', error);
    }
  };
  
  // Send a chat message
  const sendMessage = async (message: string) => {
    if (!websocket || !profile || !message.trim() || !currentSessionId) {
      return;
    }
    
    // Generate a unique request ID
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setCurrentRequestId(requestId);
    setIsProcessing(true);
    
    // Add user message to chat immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'User',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      requestId,
      status: 'complete'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Save message to database
    await saveMessageToDatabase(userMessage);
    
    // Extract URL from user message if present
    if (message.includes('http://') || message.includes('https://')) {
      const urlMatch = message.match(/(https?:\/\/[^\s]+)/g);
      if (urlMatch && urlMatch[0]) {
        setWebsiteData(prev => ({
          ...prev,
          url: urlMatch[0]
        }));
      }
    }
    
    // Set a timeout to reset processing state if no response is received
    const messageTimeout = setTimeout(() => {
      if (currentRequestId === requestId) {
        setIsProcessing(false);
        setCurrentRequestId(null);
        setAgentThinking(null);
        
        // Add timeout message to chat
        const timeoutMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          sender: 'System',
          message: 'Message timed out. The server may be busy. Please try again.',
          timestamp: new Date().toISOString(),
          requestId,
          status: 'error'
        };
        
        setMessages(prev => [...prev, timeoutMessage]);
      }
    }, 60000); // 1 minute timeout
    
    // Store timeout for later cleanup
    messageTimeoutsRef.current[requestId] = messageTimeout;
    
    // Send message via WebSocket
    try {
      await websocket.sendMessage(message, requestId);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Clear timeout
      clearTimeout(messageTimeoutsRef.current[requestId]);
      delete messageTimeoutsRef.current[requestId];
      
      // Reset state
      setIsProcessing(false);
      setCurrentRequestId(null);
      setAgentThinking(null);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        sender: 'System',
        message: `Error sending message: ${error.message}`,
        timestamp: new Date().toISOString(),
        requestId,
        status: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  
  // Save message to database
  const saveMessageToDatabase = async (message: ChatMessage) => {
    if (!profile || !currentSessionId) return;
    
    try {
      // Save to chat_history table (matches backend)
      await supabase.from('chat_history').insert({
        user_id: profile.user_id,
        session_id: currentSessionId,
        sender: message.sender === 'User' ? 'user' : 'agent',
        message: message.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  };
  
  // Create a new session
  const createNewSession = async () => {
    if (!profile) throw new Error('User not authenticated');
    
    // Generate a new session ID
    const newSessionId = `${profile.user_id}_${Date.now()}`;
    
    try {
      // Save session to database
      await supabase.from('sessions').insert({
        id: newSessionId,
        user_id: profile.user_id,
        is_group: false,
        last_active: new Date().toISOString()
      });
      
      return newSessionId;
    } catch (error) {
      console.error('Error creating new session:', error);
      throw error;
    }
  };
  
  // Fetch messages for a session
  const fetchSessionMessages = async (sessionId: string, isGroup: boolean) => {
    if (!profile) return;
    
    try {
      // Fetch messages from chat_history table (matches backend)
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', profile.user_id)
        .order('timestamp', { ascending: true });
        
      if (error) throw error;
      
      const fetchedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        sender: msg.sender === 'user' ? 'User' : 'AI',
        message: msg.message,
        timestamp: msg.timestamp,
        status: 'complete'
      }));
      
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error fetching session messages:', error);
    }
  };
  
  // Clear messages for the current session
  const clearSessionMessages = () => {
    setMessages([]);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      Object.values(messageTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      messageTimeoutsRef.current = {};
      
      // Close WebSocket
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const contextValue = {
    currentSessionId,
    setCurrentSessionId,
    isGroupSession,
    setIsGroupSession,
    messages,
    sendMessage,
    isProcessing,
    agentThinking,
    currentRequestId,
    websiteData,
    solarResults,
    websocket,
    connectionStatus,
    textEnabled,
    setTextEnabled,
    voiceEnabled,
    setVoiceEnabled,
    videoEnabled,
    setVideoEnabled,
    selectedAvatarId,
    setSelectedAvatarId,
    createNewSession,
    fetchSessionMessages,
    clearSessionMessages
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};