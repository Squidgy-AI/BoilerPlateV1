'use client';

import React, { useState, useRef, useEffect } from 'react';
import type StreamingAvatar from "@heygen/streaming-avatar";
import { TaskMode, TaskType } from "@heygen/streaming-avatar";
import InteractiveAvatar from './InteractiveAvatar';
import AvatarSelector from './AvatarSelector';
import ToolExecutionVisualizer from './ToolExecutionVisualizer';
import UserDashboard from './UserDashboard';
import WebSocketDebugger from './WebSocketDebugger';
import ConnectionStatus from './ConnectionStatus';
import { createOptimizedWebSocketConnection } from './WebSocketUtils';

interface ChatMessage {
  sender: string;
  message: string;
  requestId?: string;
  status?: 'complete' | 'thinking' | 'error';
}

interface ChatbotProps {
  userId: string;
  sessionId: string;
  onSessionChange?: (sessionId: string) => void;
  initialTopic?: string | null;
}

// Interface for exposing WebSocket and processing state
export interface ChatProcessingState {
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
}

// Create a singleton object to store the processing state
export const processingState: ChatProcessingState = {
  websocket: null,
  currentRequestId: null,
  isProcessing: false
};

// Method to get current processing state from outside
export const getChatProcessingState = (): ChatProcessingState => {
  return {
    websocket: processingState.websocket,
    currentRequestId: processingState.currentRequestId,
    isProcessing: processingState.isProcessing
  };
};

import ConnectionLostBanner from './ConnectionLostBanner';

const Chatbot: React.FC<ChatbotProps> = ({ userId, sessionId, onSessionChange, initialTopic }) => {
  // State management
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  const [textEnabled, setTextEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
const [showConnectionLost, setShowConnectionLost] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('Anna_public_3_20240108');
  
  // New state for n8n backend toggle and streaming
  const [useN8nBackend, setUseN8nBackend] = useState(true);
  const [streamingProgress, setStreamingProgress] = useState<number>(0);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  
  // State for tracking the current request
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  
  // State for website data
  const [websiteData, setWebsiteData] = useState<{
    url?: string;
    screenshot?: string;
    favicon?: string;
    analysis?: string;
  }>({});
  
  // Refs
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef<boolean>(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Handler for Retry button
  const handleRetryConnection = () => {
    setShowConnectionLost(false);
    setAgentThinking(null);
    setConnectionStatus('connecting');
    reconnectAttemptsRef.current = 0;
    // Log to debug console
    if (typeof window !== 'undefined') {
      console.info('User clicked Retry. Attempting to reconnect WebSocket...');
    }
    connectWebSocket();
  };

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimestamp = useRef<number>(Date.now());
  const messageTimeoutsRef = useRef<{[key: string]: ReturnType<typeof setTimeout>}>({});

  /**
   * Function to call n8n webhook endpoint with request_id support
   * This sends a request to the backend which routes it through n8n workflows
   * @param userInput - The user's message
   * @param requestId - Unique identifier for this request
   * @returns Promise with n8n response
   */
  const callN8nEndpoint = async (userInput: string, requestId: string, agentType: string = 're-engage') => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE;
      // Include agent name and session_id in the URL
      const response = await fetch(`https://${apiBase}/n8n_main_req/${agentType}/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_mssg: userInput,
          session_id: sessionId,
          agent_name: agentType,
          timestamp_of_call_made: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('n8n response with request_id:', data.session_id);
    
      return data;
    } 
    catch (error) {
      console.error('Error calling n8n endpoint:', error);
      throw error;
    }
  };

  // Effect to sync the internal state with the exported singleton
  useEffect(() => {
    console.log("Loading state changed:", loading);
    // Update the exported state whenever internal state changes
    processingState.websocket = websocketRef.current;
    processingState.currentRequestId = currentRequestId;
    processingState.isProcessing = loading;
  }, [websocketRef.current, currentRequestId, loading]);

  // Safety timeout to reset loading state if it gets stuck
  useEffect(() => {
    if (loading) {
      const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout triggered - resetting loading state');
        setLoading(false);
        if (currentRequestId) {
          setCurrentRequestId(null);
        }
      }, 60000); // 1 minute timeout as safety
      
      return () => clearTimeout(safetyTimeout);
    }
  }, [loading]);

  // Handler for avatar change
  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
  };

  // Effect to scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      console.log('Scrolling chat to bottom', chatHistory.length);
      const scrollHeight = chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTop = scrollHeight;
    }
  }, [chatHistory, agentThinking]);

  // Effect to handle initialTopic and session changes
  useEffect(() => {
    // Function to fetch chat history
    const fetchChatHistory = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE;
        const response = await fetch(`https://${apiBase}/chat-history?session_id=${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched initial chat history:", data);
          
          if (data.history && data.history.length > 0) {
            // Convert the backend format to our chat message format
            const formattedHistory = data.history.map((msg: any) => ({
              sender: msg.sender,
              message: msg.message,
              status: 'complete' as 'complete'
            }));
            
            setChatHistory([...formattedHistory]);
          }
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    // Reset state for new session
    initialMessageSent.current = false;
    setAgentThinking(null);
    setCurrentRequestId(null);
    setWebsiteData({});
    setStreamingProgress(0);
    setStreamingStatus('');
    
    // Clean up any pending reconnect timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Set connection status
    setConnectionStatus(useN8nBackend ? 'connected' : 'connecting');
    
    // Start WebSocket connection if not using n8n backend
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Connect to WebSocket for receiving streaming updates
    connectWebSocket();
    
    // Fetch chat history in parallel
    fetchChatHistory();
    
  }, [sessionId]);

  // Function to connect WebSocket (now used for streaming updates even with n8n)
  const connectWebSocket = () => {
    if (!userId || !sessionId) return;

    // Close existing connection if any
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Make sure connection status is set to connecting
    setConnectionStatus('connecting');
    console.log("Setting connection status to 'connecting'");

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = process.env.NEXT_PUBLIC_API_BASE;
    const wsUrl = `${wsProtocol}//${wsBase}/ws/${userId}/${sessionId}`;
    
    console.log("Connecting to WebSocket URL:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      
      // Set a longer connection timeout (6 seconds instead of 3)
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== 1) {
          console.log("WebSocket connection timeout");
          if (ws.readyState === 0) { // Still in CONNECTING state
            ws.close();
          }
        }
      }, 6000);
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        console.log("Setting connection status to 'connected'");
        reconnectAttemptsRef.current = 0;
        websocketRef.current = ws;
        
        // Update the exported state with the new WebSocket
        processingState.websocket = ws;
        
        // Start chat immediately without delay
        if (!chatStarted && !initialMessageSent.current) {
          startChat();
        }
      };
      
      ws.onmessage = handleWebSocketMessage;
      
      ws.onclose = handleWebSocketClose;
      
      ws.onerror = handleWebSocketError;
      
    }
    catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionStatus('disconnected');
      
      // Set up faster auto-reconnect (1 second instead of 3)
      const reconnectDelay = 1000;
      console.log(`WebSocket creation error. Retrying in ${reconnectDelay/1000} seconds...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionStatus('connecting');
        connectWebSocket();
      }, reconnectDelay);
    }
  };

  const handleWebSocketClose = (event: CloseEvent) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    websocketRef.current = null;
    setConnectionStatus('disconnected');
    
    // Update the exported state when WebSocket disconnects
    processingState.websocket = null;
    
    // Use shorter reconnect delays
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      const reconnectDelay = Math.min(300 * 2 ** reconnectAttemptsRef.current, 5000);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionStatus('connecting');
        connectWebSocket();
      }, reconnectDelay);
    } else {
      setAgentThinking(null);
      setShowConnectionLost(true);
      // Log to debug console and clear session cookies/localStorage
      try {
        if (typeof window !== 'undefined') {
          // Attempt to clear localStorage/sessionStorage
          localStorage.clear();
          sessionStorage.clear();
          // Attempt to clear cookies (basic)
          document.cookie.split(';').forEach(function(c) {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
          });
        }
        console.error('Max reconnect attempts reached. Cleared session/localStorage. User must start over.');
      } catch (err) {
        console.error('Error clearing session/localStorage:', err);
      }
    }
  };

  const handleWebSocketError = (event: Event) => {
    console.error('WebSocket error:', event);
    
    // Only show error if already closed
    if (websocketRef.current && websocketRef.current.readyState === 3) {
      setAgentThinking("Cannot connect to server. Please check if the server is running.");
    }
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      // Handle streaming updates from n8n via backend
      if (data.type === 'acknowledgment' || 
          data.type === 'intermediate' || 
          data.type === 'tools_usage' || 
          data.type === 'complete' || 
          data.type === 'final') {
        handleStreamingUpdate(data);
        return;
      }
      
      // Handle existing WebSocket message types
      switch (data.type) {
        case 'connection_status':
          setConnectionStatus(data.status);
          break;
          
        case 'ack':
          console.log(`Request ${data.requestId} acknowledged`);
          break;
          
        case 'processing_start':
          setAgentThinking('Squidgy is thinking...');
          break;
          
        case 'agent_thinking':
          setAgentThinking(`${data.agent} is thinking...`);
          break;
          
        case 'agent_update':
          setAgentThinking(`${data.agent}: ${data.message}`);
          break;
          
        case 'agent_response':
          handleAgentResponse(data);
          break;
          
        case 'tool_execution':
          handleToolExecution(data);
          break;
          
        case 'tool_result':
          handleToolResult(data);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  // New function to handle streaming updates from n8n
  const handleStreamingUpdate = (data: any) => {
    console.log('Handling streaming update:', data);
    
    switch (data.type) {
      case 'acknowledgment':
        setStreamingProgress(data.progress || 0);
        setStreamingStatus(data.message);
        setAgentThinking(data.message);
        break;
        
      case 'intermediate':
        setStreamingProgress(data.progress || 30);
        setStreamingStatus(data.message);
        setAgentThinking(data.message);
        
        // Check if this is a tools usage stage
        if (data.metadata?.stage === 'tools_usage' && data.metadata?.tools) {
          console.log('Tools being used:', data.metadata.tools);
        }
        break;
        
      case 'tools_usage':
        setStreamingProgress(data.progress || 75);
        setStreamingStatus(`Using tools: ${data.metadata?.tools?.join(', ') || ''}`);
        setAgentThinking(data.message);
        break;
        
      case 'complete':
        setStreamingProgress(100);
        setStreamingStatus('Response ready');
        
        // Process the final response
        if (data.agent_response) {
          handleAgentResponse({
            type: 'agent_response',
            agent: data.agent,
            message: data.agent_response,
            requestId: data.requestId || data.metadata?.session_id,
            final: true
          });
        }
        
        // Reset streaming states after a short delay
        setTimeout(() => {
          setStreamingProgress(0);
          setStreamingStatus('');
        }, 1000);
        break;
        
      case 'final':
        setStreamingProgress(100);
        setStreamingStatus('All agents completed');
        setAgentThinking(null);
        setLoading(false);
        
        // Reset after delay
        setTimeout(() => {
          setStreamingProgress(0);
          setStreamingStatus('');
        }, 1000);
        break;
    }
  };

  // Function to handle tool execution events
  const handleToolExecution = (data: any) => {
    console.log(`Tool execution started: ${data.tool} with ID ${data.executionId}`);
    
    // Extract URL from tool parameters if available
    if (data.tool === 'capture_website_screenshot' || 
        data.tool === 'get_website_favicon' || 
        data.tool === 'analyze_with_perplexity') {
      if (data.params && data.params.url) {
        // Update website data with the URL
        setWebsiteData(prev => ({
          ...prev,
          url: data.params.url
        }));
      }
    }
  };

  // Function to handle tool result events
  const handleToolResult = (data: any) => {
    console.log(`Tool result received: ${data.executionId}`);
    
    // Process tool results based on the tool type
    if (data.executionId) {
      // Handle screenshot result
      if (data.tool === 'capture_website_screenshot') {
        let screenshotPath = '';
        
        // Handle different result formats
        if (typeof data.result === 'object' && data.result && data.result.status === 'success' && data.result.path) {
          screenshotPath = data.result.path;
        } else if (typeof data.result === 'object' && data.result && data.result.path) {
          screenshotPath = data.result.path;
        } else if (typeof data.result === 'string') {
          screenshotPath = data.result;
        }
        
        // Ensure path has the correct format
        if (screenshotPath && typeof screenshotPath === 'string') {
          // If path is just a filename, add the full path
          if (!screenshotPath.startsWith('/') && !screenshotPath.startsWith('http')) {
            screenshotPath = `/static/screenshots/${screenshotPath}`;
          }
          
          // If path doesn't include the backend URL, add it
          if (screenshotPath.startsWith('/static/')) {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE;
            screenshotPath = `https://${apiBase}${screenshotPath}`;
          }
        }
        
        if (screenshotPath) {
          setWebsiteData(prev => ({
            ...prev,
            screenshot: screenshotPath
          }));
        }
      }
      
      // Handle favicon result
      else if (data.tool === 'get_website_favicon' && data.result) {
        let faviconPath = '';
        
        if (typeof data.result === 'object' && data.result && data.result.path) {
          faviconPath = data.result.path;
        } else if (typeof data.result === 'string') {
          faviconPath = data.result;
        }
        
        // Ensure path has the correct format
        if (faviconPath && typeof faviconPath === 'string') {
          // If path is just a filename, add the full path
          if (!faviconPath.startsWith('/') && !faviconPath.startsWith('http')) {
            faviconPath = `/static/favicons/${faviconPath}`;
          }
          
          // If path doesn't include the backend URL, add it
          if (faviconPath.startsWith('/static/')) {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE;
            faviconPath = `https://${apiBase}${faviconPath}`;
          }
        } else {
          // Set default empty string if path is not a string
          faviconPath = '';
        }
        
        console.log("Setting favicon path:", faviconPath);
        setWebsiteData(prev => ({
          ...prev,
          favicon: faviconPath
        }));
      }
      
      // Handle perplexity analysis result
      else if (data.tool === 'analyze_with_perplexity' && data.result) {
        let analysis = null;
        if (typeof data.result === 'object' && data.result && data.result.analysis) {
          analysis = data.result.analysis;
        } else if (typeof data.result === 'string') {
          analysis = data.result;
        }
        
        if (analysis) {
          console.log("Setting website analysis:", analysis);
          setWebsiteData(prev => ({
            ...prev,
            analysis: analysis
          }));
        }
      }
    }
  };

  /**
   * Main function to start chat - supports both n8n and WebSocket modes
   * This initializes the conversation with the AI
   */
  const startChat = async () => {
    if (initialMessageSent.current) {
      return;
    }
    
    console.log("Starting chat immediately");
    setChatStarted(true);
    initialMessageSent.current = true;
    setLoading(true);
    
    // Generate a unique request ID
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setCurrentRequestId(requestId);
    
    // Update the exported state
    processingState.currentRequestId = requestId;
    processingState.isProcessing = true;
    
    if (useN8nBackend) {
      // Start chat using n8n backend
      try {
        const n8nResponse = await callN8nEndpoint("", requestId);
        
        if (n8nResponse.status === 'success') {
          // Add the greeting to chat
          if (textEnabled) {
            setChatHistory(prevHistory => [
              ...prevHistory,
              { 
                sender: 'AI', 
                message: n8nResponse.agent_response, 
                requestId: n8nResponse.session_id, 
                status: 'complete' 
              }
            ]);
          }
          
          // Speak with avatar if enabled
          if (avatarRef.current && videoEnabled && voiceEnabled) {
            await speakWithAvatar(n8nResponse.agent_response);
          }
        }
      } catch (error) {
        console.error("Error starting chat with n8n:", error);
        setChatHistory(prevHistory => [
          ...prevHistory,
          { 
            sender: 'System', 
            message: `Error starting chat: ${(error as Error).message}`, 
            requestId, 
            status: 'error' 
          }
        ]);
      } finally {
        setLoading(false);
        setCurrentRequestId(null);
      }
    } else {
      // Start chat using WebSocket
      if (!websocketRef.current) {
        setLoading(false);
        return;
      }
      
      websocketRef.current.send(JSON.stringify({
        message: "",
        requestId
      }));
    }
  };

  const handleAgentResponse = (data: any) => {
    if (data.final === true) {
      setLoading(false);
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
        setChatHistory(prevHistory => [
          ...prevHistory.filter(msg => 
            !(msg.requestId === data.requestId && msg.sender === 'AI')
          ),
          { 
            sender: 'AI', 
            message: data.message, 
            requestId: data.requestId, 
            status: 'complete' 
          }
        ]);
      }
      
      // Speak the response if avatar and voice are enabled
      if (avatarRef.current && videoEnabled && voiceEnabled) {
        speakWithAvatar(data.message);
      }
    }
  };

  /**
   * Main function to send messages - supports both n8n and WebSocket modes
   * This is called when the user clicks send or presses enter
   */
  const sendMessage = async () => {
    if (!userInput.trim()) return;
    
    // Check if we're already processing a request
    if (loading) {
      console.log("Cannot send message: Still processing previous request");
      return;
    }
    
    setLoading(true);
    setAvatarError(null);
    
    lastMessageTimestamp.current = Date.now();
    
    // Generate a unique request ID
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setCurrentRequestId(requestId);
    
    // Update the exported state
    processingState.currentRequestId = requestId;
    processingState.isProcessing = true;
    
    // Extract URL from user message if present
    if (userInput.includes('http://') || userInput.includes('https://')) {
      const urlMatch = userInput.match(/(https?:\/\/[^\s]+)/g);
      if (urlMatch && urlMatch[0]) {
        setWebsiteData(prev => ({
          ...prev,
          url: urlMatch[0]
        }));
      }
    }
    
    // Add user message to chat immediately if text is enabled
    if (textEnabled) {
      setChatHistory(prevHistory => [
        ...prevHistory, 
        { sender: "User", message: userInput, requestId, status: 'complete' }
      ]);
    }
    
    try {
      if (useN8nBackend) {
        // Send message using n8n backend
        const n8nResponse = await callN8nEndpoint(userInput, requestId);
        
        // Process n8n response
        if (n8nResponse.status === 'success') {
          // Clear thinking state
          setAgentThinking(null);
          
          // Add AI response to chat
          if (textEnabled) {
            setChatHistory(prevHistory => [
              ...prevHistory,
              { 
                sender: 'AI', 
                message: n8nResponse.agent_response, 
                requestId: n8nResponse.session_id, 
                status: 'complete' 
              }
            ]);
          }
          
          // Speak with avatar if enabled
          if (avatarRef.current && videoEnabled && voiceEnabled) {
            await speakWithAvatar(n8nResponse.agent_response);
          }
        } else {
          throw new Error(n8nResponse.error || 'Unknown error from n8n');
        }
      } else {
        // Send message using WebSocket
        if (!websocketRef.current || connectionStatus !== 'connected') {
          console.log("Cannot send message: WebSocket not connected");
          setAgentThinking("Connection issue. Attempting to reconnect...");
          connectWebSocket();
          return;
        }
        
        // Send message via WebSocket
        websocketRef.current.send(JSON.stringify({
          message: userInput,
          requestId
        }));
        
        // Set a timeout for WebSocket response
        const messageTimeout = setTimeout(() => {
          if (loading && currentRequestId === requestId) {
            console.log(`Message timeout for request ${requestId}`);
            setLoading(false);
            setCurrentRequestId(null);
            setAgentThinking(null);
            
            setChatHistory(prevHistory => [
              ...prevHistory,
              { 
                sender: "System", 
                message: "Message timed out. The server may be busy. Please try again.", 
                requestId, 
                status: 'error' 
              }
            ]);
          }
        }, 60000); // 1 minute timeout
        
        messageTimeoutsRef.current[requestId] = messageTimeout;
      }
      
      setUserInput(""); // Clear input field
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message to chat
      setChatHistory(prevHistory => [
        ...prevHistory,
        { 
          sender: "System", 
          message: `Error: ${(error as Error).message}`, 
          requestId, 
          status: 'error' 
        }
      ]);
    } finally {
      // Only reset loading state for n8n mode here if not streaming
      // For streaming mode, it will be reset when complete message is received
      if (useN8nBackend && !websocketRef.current) {
        setLoading(false);
        setCurrentRequestId(null);
        setAgentThinking(null);
      }
    }
  };

  // Function to have avatar speak the message
  const speakWithAvatar = async (text: string) => {
    if (!avatarRef.current || !videoEnabled || !voiceEnabled) return;
    
    try {
      await avatarRef.current.speak({
        text: text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC
      });
    } catch (error) {
      console.error("Avatar speak error:", error);
      setAvatarError("Failed to activate avatar speech. Text response still available.");
    }
  };

  // Function to handle when the avatar is ready
  const handleAvatarReady = () => {
    console.log("Avatar is ready");
    if (!chatStarted && ((websocketRef.current && connectionStatus === 'connected') || useN8nBackend)) {
      startChat();
    }
  };

  // Function to handle new session requests
  const handleNewSession = () => {
    // Generate a new session ID
    const newSessionId = `${userId}_${Date.now()}`;
    
    // Notify parent component about session change
    if (onSessionChange) {
      onSessionChange(newSessionId);
    }
  };

  // Function to handle session selection
  const handleSessionSelect = (selectedSessionId: string) => {
    // Notify parent component about session change
    if (onSessionChange) {
      onSessionChange(selectedSessionId);
    }
  };

  // Function to handle topic selection
  const handleTopicSelect = (topic: string) => {
    setUserInput(topic);
    // Optional: auto-send the message
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up message timeouts
      Object.values(messageTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      messageTimeoutsRef.current = {};
    };
  }, []);

  // Render the component
  return (
    <>
      {showConnectionLost && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: 9999}}>
          <ConnectionLostBanner
            onRetry={handleRetryConnection}
            message={
              'Connection to the server was lost after several attempts. Please check your connection or retry.'
            }
          />
        </div>
      )}
      {/* Left side - User dashboard */}
      <div className="w-[45%] bg-[#1B2431] h-screen overflow-auto fixed left-0 top-0">
        <UserDashboard
          userId={userId}
          currentSessionId={sessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onTopicSelect={handleTopicSelect}
          websiteData={websiteData}
          // These props are needed for visualization
          websocket={websocketRef.current}
          currentRequestId={currentRequestId}
          isProcessing={loading}
        />
        <WebSocketDebugger websocket={websocketRef.current} status={connectionStatus} />
      </div>
      {/* Right side - Chat interface */}
      <div className="w-[55%] bg-[#1E2A3B] h-screen overflow-hidden fixed right-0 top-0">
        {/* Tool execution visualizer - Only show during active tool execution */}
        <ToolExecutionVisualizer
          websocket={websocketRef.current}
          currentRequestId={currentRequestId}
          isProcessing={loading}
        />
        
        {/* Avatar Selector - now floating and draggable */}
        <AvatarSelector 
          onAvatarChange={handleAvatarChange}
          currentAvatarId={selectedAvatarId}
        />
        
        <div className="h-full flex flex-col p-6">
          {/* Connection Status Indicator */}
          <div className="absolute top-2 left-20 z-10">
            <div className={`flex items-center px-3 py-1 rounded-full text-xs transition-all duration-300 ${
              connectionStatus === 'connected' || useN8nBackend ? 'bg-green-600' : 
              connectionStatus === 'connecting' ? 'bg-yellow-600 animate-pulse' : 'bg-red-600'
            } text-white`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connected' || useN8nBackend ? 'bg-green-300' : 
                connectionStatus === 'connecting' ? 'bg-yellow-300 animate-pulse' : 'bg-red-300'
              }`}></div>
              {useN8nBackend ? 'N8N Connected' : 
              connectionStatus === 'connected' ? 'Connected' : 
              connectionStatus === 'connecting' ? (
                <span className="flex items-center">
                  Connecting
                  <span className="ml-1 flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <span 
                        key={i} 
                        className="h-1 w-1 bg-yellow-300 rounded-full animate-bounce" 
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                  {reconnectAttemptsRef.current > 0 && (
                    <span className="ml-1 opacity-75 text-[10px]">
                      ({reconnectAttemptsRef.current})
                    </span>
                  )}
                </span>
              ) : 'Disconnected'}
            </div>
          </div>

          {/* Streaming Progress Indicator - Show when n8n is active with streaming */}
          {useN8nBackend && streamingProgress > 0 && (
            <div className="absolute top-2 left-64 z-10">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">
                <div className="flex items-center">
                  <div className="mr-2">{streamingStatus}</div>
                  <div className="w-16 bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-300 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${streamingProgress}%` }}
                    />
                  </div>
                  <div className="ml-2">{streamingProgress}%</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Avatar Controls */}
          <div className="absolute top-4 right-4 z-10 flex space-x-4">
            {/* Backend Toggle (OPTIONAL) */}
            <div className="flex items-center">
              <span className="text-white mr-2 text-sm">Backend</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={useN8nBackend} 
                  onChange={() => setUseN8nBackend(!useN8nBackend)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="flex items-center">
              <span className="text-white mr-2 text-sm">Text</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={textEnabled} 
                  onChange={() => setTextEnabled(!textEnabled)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="flex items-center">
              <span className="text-white mr-2 text-sm">Voice</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={voiceEnabled} 
                  onChange={() => setVoiceEnabled(!voiceEnabled)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="flex items-center">
              <span className="text-white mr-2 text-sm">Video</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={videoEnabled} 
                  onChange={() => {
                    setVideoEnabled(!videoEnabled);
                    setAvatarEnabled(!videoEnabled);
                  }} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
          
          {/* Avatar Video Section */}
          <div className="relative h-[430px] mb-4 mt-16">
            <InteractiveAvatar
              onAvatarReady={handleAvatarReady}
              avatarRef={avatarRef}
              enabled={videoEnabled}
              sessionId={sessionId}
              voiceEnabled={voiceEnabled}
              avatarId={selectedAvatarId}
            />
            
            {/* Avatar Error Message */}
            {avatarError && (
              <div className="absolute bottom-4 left-0 right-0 mx-auto text-center">
                <div className="bg-red-800 text-white px-4 py-2 rounded-lg inline-block">
                  {avatarError}
                </div>
              </div>
            )}
          </div>
  
          {/* Chat History and Input Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat History */}
            <div 
              ref={chatContainerRef}
              className={`flex-1 bg-[#2D3B4F] rounded-lg overflow-y-auto mb-4 max-h-[calc(100vh-600px)] ${
                !textEnabled ? 'opacity-50' : ''
              }`}
            >
              {loading && chatHistory.length === 0 ? (
                <div className="p-4 text-white text-center">
                  Loading conversation...
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="p-4 text-white text-center">
                  No messages yet. Start a conversation below.
                </div>
              ) : (
                <>
                  {chatHistory.map((msg, index) => (
                    <div
                      key={`chat-msg-${index}`}
                      className={`p-4 border-b border-gray-700 ${
                        msg.sender === "System" ? "bg-red-900 bg-opacity-20" : ""
                      }`}
                    >
                      <span className={`font-bold ${
                        msg.sender === "AI" ? "text-blue-400" :
                        msg.sender === "User" ? "text-green-400" : "text-red-400"
                      }`}>
                        {msg.sender}: 
                      </span>
                      <span className="text-white ml-2">{msg.message}</span>
                    </div>
                  ))}
                  
                  {/* Show agent thinking status */}
                  {agentThinking && (
                    <div className="p-4 border-b border-gray-700 bg-blue-900 bg-opacity-20">
                      <div className="flex items-center">
                        <div className="animate-pulse w-3 h-3 bg-blue-300 rounded-full mr-3"></div>
                        <span className="text-blue-300 font-medium">{agentThinking}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
  
            {/* Input Section */}
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-[#2D3B4F] text-white rounded-lg px-4 py-3"
                placeholder={
                  loading
                    ? "Processing..." 
                    : useN8nBackend
                      ? "Type your message..."
                      : connectionStatus === 'connecting' 
                        ? "Connecting to server..." 
                        : connectionStatus === 'disconnected'
                          ? "Disconnected from server..."
                          : "Type your message..."
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !loading) {
                    sendMessage();
                  }
                }}
                disabled={loading || (!useN8nBackend && connectionStatus === 'disconnected')}
              />
              <button
                onClick={() => {
                  if (loading) return;
                  
                  if (!useN8nBackend && connectionStatus !== 'connected') {
                    // Try to reconnect if disconnected
                    if (connectionStatus === 'disconnected') {
                      connectWebSocket();
                    }
                    return;
                  }
                  
                  sendMessage();
                }}
                className={`
                  text-white px-8 py-3 rounded-lg font-medium transition-colors
                  ${loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : useN8nBackend
                      ? "bg-blue-600 hover:bg-blue-700"
                      : connectionStatus === 'connecting'
                        ? "bg-yellow-600 cursor-wait"
                        : connectionStatus === 'disconnected'
                          ? "bg-gray-600"
                          : "bg-blue-600 hover:bg-blue-700"
                  }
                `}
                disabled={loading || (!useN8nBackend && connectionStatus !== 'connected')}
              >
                {loading ? "Processing..." :
                connectionStatus === 'connecting' && !useN8nBackend ? "Connecting..." : 
                connectionStatus === 'disconnected' && !useN8nBackend ? "Disconnected" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
