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
import { getAgentById, getAgentName, AGENT_CONFIG } from '@/config/agents';
import ConnectionLostBanner from './ConnectionLostBanner';

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

export interface ChatProcessingState {
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
}

export const processingState: ChatProcessingState = {
  websocket: null,
  currentRequestId: null,
  isProcessing: false
};

export const getChatProcessingState = (): ChatProcessingState => {
  return {
    websocket: processingState.websocket,
    currentRequestId: processingState.currentRequestId,
    isProcessing: processingState.isProcessing
  };
};

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
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('leadgenkb');
  const [avatarInitialized, setAvatarInitialized] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [initialMessageShown, setInitialMessageShown] = useState(false);
  const avatarInitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimestamp = useRef<number>(Date.now());
  const messageTimeoutsRef = useRef<{[key: string]: ReturnType<typeof setTimeout>}>({});
  
  // Add a ref to track if we're switching agents
  const isSwitchingAgent = useRef(false);
  const lastAgentId = useRef<string>('');
  const avatarLoadingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Function to call n8n webhook endpoint with request_id support
  const callN8nEndpoint = async (userInput: string, requestId: string, agentName: string = 'presaleskb') => {
    try {
      console.log("Calling n8n with:", { userInput, requestId, agentName });
      
      const apiBase = process.env.NEXT_PUBLIC_API_BASE;
      const response = await fetch(`https://${apiBase}/n8n_main_req/${agentName}/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_mssg: userInput || "Hello",
          session_id: sessionId,
          agent_name: agentName,
          timestamp_of_call_made: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('n8n response:', data);
    
      return data;
    } 
    catch (error) {
      console.error('Error calling n8n endpoint:', error);
      throw error;
    }
  };

  // Effect to sync the internal state with the exported singleton
  useEffect(() => {
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
    console.log("Avatar change requested:", avatarId);
    isSwitchingAgent.current = true;
    setSelectedAvatarId(avatarId);
  };

  const getCurrentAgent = () => {
    return getAgentById(selectedAvatarId);
  };

  // Simplified function to show initial message
  const showInitialMessage = (agent: any, isSwitch: boolean = false) => {
    if (!textEnabled || !agent) return;
    
    console.log(`Showing initial message for agent: ${agent.name}`);
    
    // Add message to chat
    const messageId = `${isSwitch ? 'switch' : 'initial'}-${Date.now()}`;
    setChatHistory(prev => [...prev, { 
      sender: 'AI', 
      message: agent.introMessage, 
      requestId: messageId, 
      status: 'complete' 
    }]);
    
    // Try to speak only if avatar is ready
    if (avatarRef.current && videoEnabled && voiceEnabled && avatarInitialized && !avatarFailed) {
      speakWithAvatar(agent.introMessage).catch(err => {
        console.log("Could not speak initial message:", err);
      });
    }
    
    setInitialMessageShown(true);
  };

  // Function to start chat
  const startChat = async () => {
    console.log("Starting chat - chatStarted:", chatStarted, "initialMessageShown:", initialMessageShown);
    
    setChatStarted(true);
    
    const agent = getCurrentAgent();
    if (agent && !initialMessageShown) {
      showInitialMessage(agent, false);
    }
  };

  // Handler for avatar ready
  const handleAvatarReady = () => {
    console.log("Avatar initialization complete");
    setAvatarInitialized(true);
    setAvatarFailed(false);
    
    // Clear any loading timeout
    if (avatarLoadingTimeout.current) {
      clearTimeout(avatarLoadingTimeout.current);
      avatarLoadingTimeout.current = null;
    }
    
    // If we haven't started chat yet, start it now
    if (!chatStarted) {
      startChat();
    }
  };

  // Handler for avatar errors
  const handleAvatarError = (error: string) => {
    console.log("Avatar error occurred:", error);
    setAvatarFailed(true);
    setAvatarError(error);
    setAvatarInitialized(true);
    
    // Clear any loading timeout
    if (avatarLoadingTimeout.current) {
      clearTimeout(avatarLoadingTimeout.current);
      avatarLoadingTimeout.current = null;
    }
    
    // Still start chat even if avatar fails
    if (!chatStarted) {
      startChat();
    }
  };

  // Function to handle avatar timeout
  const handleAvatarTimeout = () => {
    console.log("Avatar loading timeout - using fallback");
    setAvatarFailed(true);
    setAvatarInitialized(true);
    setAvatarError("Avatar loading timed out - using fallback image");
    
    // Start chat with fallback
    if (!chatStarted) {
      startChat();
    }
  };

  // Effect to scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollHeight = chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTop = scrollHeight;
    }
  }, [chatHistory, agentThinking]);

  // Effect to handle session changes
  // Replace the session change effect (around line 282) with this:

// Effect to handle session changes
useEffect(() => {
  console.log("Session changed to:", sessionId);
  
  // Reset state for new session
  setChatHistory([]);
  setAgentThinking(null);
  setCurrentRequestId(null);
  setWebsiteData({});
  setStreamingProgress(0);
  setStreamingStatus('');
  setChatStarted(false);
  setInitialMessageShown(false);
  setAvatarInitialized(false);
  setAvatarFailed(false);
  setAvatarError(null);
  isSwitchingAgent.current = false;
  
  // Clear any pending timeouts
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }
  if (avatarLoadingTimeout.current) {
    clearTimeout(avatarLoadingTimeout.current);
    avatarLoadingTimeout.current = null;
  }
  
  // If video is disabled, start chat immediately
  if (!videoEnabled) {
    setTimeout(() => {
      console.log("Video disabled, starting chat immediately");
      startChat();
    }, 500);
  } else {
    // Set up avatar loading timeout (10 seconds)
    avatarLoadingTimeout.current = setTimeout(() => {
      if (!avatarInitialized && videoEnabled) {
        console.log("Avatar loading timeout reached");
        handleAvatarTimeout();
      }
    }, 10000);
  }
  
  // Connect to WebSocket
  if (websocketRef.current) {
    websocketRef.current.close();
    websocketRef.current = null;
  }
  
  connectWebSocket();
  
  // Fetch chat history
  const fetchChatHistory = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE;
      const response = await fetch(`https://${apiBase}/chat-history?session_id=${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched initial chat history:", data);
        
        if (data.history && data.history.length > 0) {
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
  
  fetchChatHistory();
}, [sessionId, videoEnabled]);

  // Effect to handle agent changes
  useEffect(() => {
    if (!selectedAvatarId || selectedAvatarId === lastAgentId.current) return;
    
    console.log("Agent changed from", lastAgentId.current, "to", selectedAvatarId);
    lastAgentId.current = selectedAvatarId;
    
    // Clear any existing avatar timeout
    if (avatarLoadingTimeout.current) {
      clearTimeout(avatarLoadingTimeout.current);
      avatarLoadingTimeout.current = null;
    }
    
    // Set new timeout for agent switch (8 seconds for switches)
    if (isSwitchingAgent.current && videoEnabled) {
      avatarLoadingTimeout.current = setTimeout(() => {
        if (!avatarInitialized) {
          console.log("Agent switch avatar timeout");
          handleAvatarTimeout();
        }
      }, 8000);
    }
    
    // If we're switching agents and chat has started
    if (isSwitchingAgent.current && chatStarted) {
      const agent = getCurrentAgent();
      if (agent) {
        // Wait a bit to ensure avatar is ready
        setTimeout(() => {
          showInitialMessage(agent, true);
          isSwitchingAgent.current = false;
        }, 500);
      }
    }
  }, [selectedAvatarId, chatStarted, videoEnabled]);

  // Function to connect WebSocket
  const connectWebSocket = () => {
    if (!userId || !sessionId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = process.env.NEXT_PUBLIC_API_BASE;
    const wsUrl = `${wsProtocol}//${wsBase}/ws/${userId}/${sessionId}`;
    
    console.log("[WebSocket] Connecting to:", wsUrl);
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== 1) {
          console.log(`[WebSocket] Connection timeout`);
          if (ws.readyState === 0) {
            ws.close();
          }
        }
      }, 6000);
      
      ws.onopen = (event) => {
        clearTimeout(connectionTimeout);
        console.log('[WebSocket] Connected');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        websocketRef.current = ws;
        processingState.websocket = ws;
      };
      
      ws.onmessage = (event) => {
        console.log('[WebSocket] Message received', event.data);
        handleWebSocketMessage(event);
      };
      
      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', event);
        websocketRef.current = null;
        setConnectionStatus('disconnected');
        processingState.websocket = null;
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const reconnectDelay = Math.min(300 * 2 ** reconnectAttemptsRef.current, 5000);
          console.log(`[WebSocket] Reconnecting in ${reconnectDelay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionStatus('connecting');
            connectWebSocket();
          }, reconnectDelay);
        }
      };
      
      ws.onerror = (event) => {
        console.error('[WebSocket] Error occurred', event);
      };
      
    } catch (error) {
      console.error('[WebSocket] Error creating WebSocket:', error);
      setConnectionStatus('disconnected');
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

  // Handle streaming updates from n8n
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
        break;
        
      case 'tools_usage':
        setStreamingProgress(data.progress || 75);
        setStreamingStatus(`Using tools: ${data.metadata?.tools?.join(', ') || ''}`);
        setAgentThinking(data.message);
        break;
        
      case 'complete':
        setStreamingProgress(100);
        setStreamingStatus('Response ready');
        
        if (data.agent_response) {
          handleAgentResponse({
            type: 'agent_response',
            agent: data.agent,
            message: data.agent_response,
            requestId: data.requestId || data.metadata?.session_id,
            final: true
          });
        }
        
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
    
    if (data.tool === 'capture_website_screenshot' || 
        data.tool === 'get_website_favicon' || 
        data.tool === 'analyze_with_perplexity') {
      if (data.params && data.params.url) {
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
        
        if (typeof data.result === 'object' && data.result && data.result.status === 'success' && data.result.path) {
          screenshotPath = data.result.path;
        } else if (typeof data.result === 'object' && data.result && data.result.path) {
          screenshotPath = data.result.path;
        } else if (typeof data.result === 'string') {
          screenshotPath = data.result;
        }
        
        if (screenshotPath && typeof screenshotPath === 'string') {
          if (!screenshotPath.startsWith('/') && !screenshotPath.startsWith('http')) {
            screenshotPath = `/static/screenshots/${screenshotPath}`;
          }
          
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
        
        if (faviconPath && typeof faviconPath === 'string') {
          if (!faviconPath.startsWith('/') && !faviconPath.startsWith('http')) {
            faviconPath = `/static/favicons/${faviconPath}`;
          }
          
          if (faviconPath.startsWith('/static/')) {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE;
            faviconPath = `https://${apiBase}${faviconPath}`;
          }
        }
        
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
          setWebsiteData(prev => ({
            ...prev,
            analysis: analysis
          }));
        }
      }
    }
  };

  const handleAgentResponse = (data: any) => {
    if (data.final === true) {
      setLoading(false);
      setAgentThinking(null);
      
      if (data.requestId && messageTimeoutsRef.current[data.requestId]) {
        clearTimeout(messageTimeoutsRef.current[data.requestId]);
        delete messageTimeoutsRef.current[data.requestId];
      }
      
      if (currentRequestId === data.requestId) {
        setCurrentRequestId(null);
      }
      
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
      
      if (avatarRef.current && videoEnabled && voiceEnabled) {
        speakWithAvatar(data.message);
      }
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    
    if (loading) {
      console.log("Cannot send message: Still processing");
      return;
    }
    
    setLoading(true);
    setAvatarError(null);
    
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setCurrentRequestId(requestId);
    processingState.currentRequestId = requestId;
    processingState.isProcessing = true;
    
    const urlMatch = userInput.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch && urlMatch[0]) {
      setWebsiteData(prev => ({
        ...prev,
        url: urlMatch[0]
      }));
    }
    
    if (textEnabled) {
      setChatHistory(prevHistory => [
        ...prevHistory, 
        { sender: "User", message: userInput, requestId, status: 'complete' }
      ]);
    }
    
    try {
      if (useN8nBackend) {
        const agent = getCurrentAgent();
        
        if (agent) {
          const agentName = agent.agent_name;
          
          console.log("Sending to n8n with agent:", agentName);
          const n8nResponse = await callN8nEndpoint(userInput, requestId, agentName);
          
          if (n8nResponse.status === 'success') {
            setAgentThinking(null);
            
            if (textEnabled && n8nResponse.agent_response) {
              setChatHistory(prevHistory => [
                ...prevHistory,
                { 
                  sender: 'AI', 
                  message: n8nResponse.agent_response, 
                  requestId: n8nResponse.session_id || requestId, 
                  status: 'complete' 
                }
              ]);
            }
            
            if (avatarRef.current && videoEnabled && voiceEnabled && n8nResponse.agent_response) {
              await speakWithAvatar(n8nResponse.agent_response);
            }
          } else {
            throw new Error(n8nResponse.error || 'Unknown error from n8n');
          }
        } else {
          throw new Error('No agent selected');
        }
      } else {
        // WebSocket mode
        if (!websocketRef.current || connectionStatus !== 'connected') {
          console.log("Cannot send message: WebSocket not connected");
          setAgentThinking("Connection issue. Attempting to reconnect...");
          connectWebSocket();
          return;
        }
        
        websocketRef.current.send(JSON.stringify({
          message: userInput,
          requestId
        }));
        
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
        }, 60000);
        
        messageTimeoutsRef.current[requestId] = messageTimeout;
      }
      
      setUserInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      
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
      if (useN8nBackend) {
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

  // Function to handle new session requests
  const handleNewSession = () => {
    const newSessionId = `${userId}_${Date.now()}`;
    
    if (onSessionChange) {
      onSessionChange(newSessionId);
    }
  };

  // Function to handle session selection
  const handleSessionSelect = (selectedSessionId: string) => {
    if (onSessionChange) {
      onSessionChange(selectedSessionId);
    }
  };

  // Function to handle topic selection
  const handleTopicSelect = (topic: string) => {
    setUserInput(topic);
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  // Handler for Retry button
  const handleRetryConnection = () => {
    setShowConnectionLost(false);
    setAgentThinking(null);
    setConnectionStatus('connecting');
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      Object.values(messageTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      messageTimeoutsRef.current = {};
      
      if (avatarLoadingTimeout.current) {
        clearTimeout(avatarLoadingTimeout.current);
        avatarLoadingTimeout.current = null;
      }
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
          websocket={websocketRef.current}
          currentRequestId={currentRequestId}
          isProcessing={loading}
        />
        <WebSocketDebugger websocket={websocketRef.current} status={connectionStatus} />
      </div>
      {/* Right side - Chat interface */}
      <div className="w-[55%] bg-[#1E2A3B] h-screen overflow-hidden fixed right-0 top-0">
        {/* Tool execution visualizer */}
        <ToolExecutionVisualizer
          websocket={websocketRef.current}
          currentRequestId={currentRequestId}
          isProcessing={loading}
        />
        
        {/* Avatar Selector */}
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

          {/* Streaming Progress Indicator */}
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
            {/* Backend Toggle */}
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
              onAvatarError={handleAvatarError}
              avatarTimeout={10000}
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

// Error boundary wrapper
interface ChatErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChatErrorBoundary extends React.Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#1B2431]">
          <div className="text-center text-white">
            <h2 className="text-2xl mb-4">Something went wrong</h2>
            <p className="mb-4">Please refresh the page to try again</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ChatbotWithErrorBoundary(props: ChatbotProps) {
  return (
    <ChatErrorBoundary>
      <Chatbot {...props} />
    </ChatErrorBoundary>
  );
}