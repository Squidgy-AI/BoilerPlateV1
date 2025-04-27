// src/context/ChatContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import WebSocketService, { WebSocketMessage, getWebSocketService } from '@/services/WebSocketService';
import { useAuth } from '@/components/Auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  sender_name?: string;
  is_agent?: boolean;
  agent_type?: string;
  requestId?: string;
  status?: 'complete' | 'thinking' | 'error';
}

interface WebsiteData {
  url?: string;
  screenshot?: string;
  favicon?: string;
  analysis?: string;
}

interface SolarResult {
  id: string;
  address: string;
  type: 'insights' | 'datalayers' | 'report';
  timestamp: number;
  data: any;
}

export interface ChatContextType {
  // Session management
  currentSessionId: string;
  setCurrentSessionId: (sessionId: string) => void;
  isGroupSession: boolean;
  setIsGroupSession: (isGroup: boolean) => void;
  
  // WebSocket management
  websocket: WebSocketService | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  // Messages and chat state
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  isProcessing: boolean;
  agentThinking: string | null;
  currentRequestId: string | null;
  
  // Tool execution results
  websiteData: WebsiteData;
  solarResults: SolarResult[];
  
  // UI state
  textEnabled: boolean;
  setTextEnabled: (enabled: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  videoEnabled: boolean;
  setVideoEnabled: (enabled: boolean) => void;
  selectedAvatarId: string;
  setSelectedAvatarId: (avatarId: string) => void;
  
  // Session functions
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
  const [websocket, setWebsocket] = useState<WebSocketService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData>({});
  const [solarResults, setSolarResults] = useState<SolarResult[]>([]);
  
  // UI Preferences
  const [textEnabled, setTextEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('Anna_public_3_20240108');
  
  // Reference to keep track of message timeouts
  const messageTimeoutsRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  // Initialize WebSocket when session changes
  useEffect(() => {
    if (!profile || !currentSessionId) return;
    
    // Clean up any existing WebSocket
    if (websocket) {
      websocket.close();
    }
    
    // Clear any pending message timeouts
    Object.values(messageTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
    messageTimeoutsRef.current = {};
    
    // Create a new WebSocket service
    const wsService = getWebSocketService({
      userId: profile.id,
      sessionId: currentSessionId,
      onOpen: () => {
        console.log('WebSocket opened');
      },
      onClose: () => {
        console.log('WebSocket closed');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
      onReconnect: (attempt) => {
        console.log(`Reconnect attempt ${attempt}`);
      }
    });
    
    // Listen for status changes
    wsService.on('status_change', (status) => {
      setConnectionStatus(status);
    });
    
    // Listen for WebSocket messages
    wsService.on('message', handleWebSocketMessage);
    
    // Connect to the WebSocket server
    wsService.connect().catch((error) => {
      console.error('Error connecting to WebSocket:', error);
    });
    
    setWebsocket(wsService);
    
    // Reset chat state
    setAgentThinking(null);
    setCurrentRequestId(null);
    setWebsiteData({});
    setSolarResults([]);
    
    // Clean up function
    return () => {
      if (wsService) {
        wsService.removeAllListeners();
        wsService.close();
      }
    };
  }, [profile, currentSessionId]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = (data: WebSocketMessage) => {
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
          if (textEnabled && data.message) {
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
          }
        }
        break;
        
      case 'tool_execution':
        console.log(`Tool execution: ${data.tool}`, data);
        handleToolExecution(data);
        break;
        
      case 'tool_result':
        console.log(`Tool result: ${data.executionId}`, data);
        handleToolResult(data);
        break;
    }
  };
  
  // Handle tool execution event
  const handleToolExecution = (data: WebSocketMessage) => {
    // Track tool execution and update UI as needed
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
  
  // Handle tool result event
  const handleToolResult = (data: WebSocketMessage) => {
    if (!data.tool && data.executionId) {
      // Extract tool from executionId if not provided directly
      const parts = data.executionId.split('-');
      if (parts.length > 0) {
        data.tool = parts[0];
      }
    }
    
    // Handle different types of tool results
    switch (data.tool) {
      case 'analyze_with_perplexity':
        if (data.result?.analysis) {
          setWebsiteData(prev => ({
            ...prev,
            analysis: data.result.analysis
          }));
        }
        break;
        
      case 'capture_website_screenshot':
        if (data.result?.path) {
          const path = processImagePath(data.result.path, 'screenshot');
          setWebsiteData(prev => ({
            ...prev,
            screenshot: path
          }));
        }
        break;
        
      case 'get_website_favicon':
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
        // Add to solar results
        addSolarResult('insights', data);
        break;
        
      case 'get_datalayers':
      case 'datalayers':
        // Add to solar results
        addSolarResult('datalayers', data);
        break;
        
      case 'get_report':
      case 'report':
        // Add to solar results
        addSolarResult('report', data);
        break;
    }
  };
  
  // Add a solar result to the list
  const addSolarResult = (type: 'insights' | 'datalayers' | 'report', data: WebSocketMessage) => {
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
  
  // Send a chat message
  const sendMessage = async (message: string): Promise<void> => {
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
  const saveMessageToDatabase = async (message: ChatMessage): Promise<void> => {
    if (!profile || !currentSessionId) return;
    
    try {
      if (isGroupSession) {
        // Save to group_messages
        await supabase.from('group_messages').insert({
          group_id: currentSessionId,
          sender_id: message.sender === 'User' ? profile.id : null,
          message: message.message,
          is_agent: message.sender !== 'User',
          agent_type: message.sender !== 'User' ? message.sender : null
        });
      } else {
        // Save to messages (direct messages)
        await supabase.from('messages').insert({
          sender_id: message.sender === 'User' ? profile.id : 'system',
          recipient_id: message.sender === 'User' ? 'system' : profile.id,
          message: message.message
        });
      }
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  };
  
  // Create a new session
  const createNewSession = async (): Promise<string> => {
    if (!profile) throw new Error('User not authenticated');
    
    const newSessionId = `${profile.id}_${Date.now()}`;
    
    try {
      // Create session in database
      await supabase.from('sessions').insert({
        id: newSessionId,
        user_id: profile.id,
        is_group: false
      });
      
      return newSessionId;
    } catch (error) {
      console.error('Error creating new session:', error);
      throw error;
    }
  };
  
  // Fetch messages for a session
  const fetchSessionMessages = async (sessionId: string, isGroup: boolean): Promise<void> => {
    if (!profile) return;
    
    try {
      let fetchedMessages: ChatMessage[] = [];
      
      if (isGroup) {
        // Fetch group messages
        const { data, error } = await supabase
          .from('group_messages')
          .select('*, sender:sender_id(full_name)')
          .eq('group_id', sessionId)
          .order('timestamp', { ascending: true });
          
        if (error) throw error;
        
        fetchedMessages = data.map(msg => ({
          id: msg.id,
          sender: msg.is_agent ? msg.agent_type || 'AI' : 'User',
          message: msg.message,
          timestamp: msg.timestamp,
          sender_name: msg.sender?.full_name || 'Unknown',
          is_agent: msg.is_agent || false,
          agent_type: msg.agent_type,
          status: 'complete'
        }));
      } else {
        // Fetch direct messages
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:sender_id(full_name), recipient:recipient_id(full_name)')
          .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
          .or(`sender_id.eq.${sessionId},recipient_id.eq.${sessionId}`)
          .order('timestamp', { ascending: true });
          
        if (error) throw error;
        
        // Filter messages between these two parties
        const filteredMessages = data.filter(msg => 
          (msg.sender_id === profile.id && msg.recipient_id === sessionId) ||
          (msg.sender_id === sessionId && msg.recipient_id === profile.id)
        );
        
        fetchedMessages = filteredMessages.map(msg => ({
          id: msg.id,
          sender: msg.sender_id === profile.id ? 'User' : (msg.sender_id === 'system' ? 'AI' : 'Other'),
          message: msg.message,
          timestamp: msg.timestamp,
          sender_name: msg.sender?.full_name || 'Unknown',
          status: 'complete'
        }));
      }
      
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error fetching session messages:', error);
    }
  };
  
  // Clear messages for the current session
  const clearSessionMessages = () => {
    setMessages([]);
  };
  
  // Create context value object
  const contextValue: ChatContextType = {
    currentSessionId,
    setCurrentSessionId,
    isGroupSession,
    setIsGroupSession,
    websocket,
    connectionStatus,
    messages,
    sendMessage,
    isProcessing,
    agentThinking,
    currentRequestId,
    websiteData,
    solarResults,
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
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};