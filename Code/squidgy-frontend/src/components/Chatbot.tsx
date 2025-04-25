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

const Chatbot: React.FC<ChatbotProps> = ({ userId, sessionId, onSessionChange, initialTopic }) => {
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('Anna_public_3_20240108');
  
  
  // State for tracking the current request
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  
  // NEW: State for website data
  const [websiteData, setWebsiteData] = useState<{
    url?: string;
    screenshot?: string;
    favicon?: string;
    analysis?: string;
  }>({});
  
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef<boolean>(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Add this with your other state variables and refs at the top of your component
  const lastMessageTimestamp = useRef<number>(Date.now());
  const messageTimeoutsRef = useRef<{[key: string]: ReturnType<typeof setTimeout>}>({});


  // Effect to sync the internal state with the exported singleton
  // useEffect(() => {
  //   // Update the exported state whenever internal state changes
  //   processingState.websocket = websocketRef.current;
  //   processingState.currentRequestId = currentRequestId;
  //   processingState.isProcessing = loading;
  // }, [websocketRef.current, currentRequestId, loading]);

  // Add this to the useEffect that updates the processingState
useEffect(() => {
  console.log("Loading state changed:", loading);
  // Update the exported state whenever internal state changes
  processingState.websocket = websocketRef.current;
  processingState.currentRequestId = currentRequestId;
  processingState.isProcessing = loading;
}, [websocketRef.current, currentRequestId, loading]);

useEffect(() => {
  // Safety timeout to reset loading state if it gets stuck
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
  // useEffect(() => {
  //   if (chatContainerRef.current) {
  //     chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  //   }
  // }, [chatHistory, agentThinking]);

  // Effect to handle initialTopic
// In Chatbot.tsx - add this effect to load chat history on session change
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
          const formattedHistory = data.history.map(msg => ({
            sender: msg.sender,
            message: msg.message,
            status: 'complete'
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
  
  // Clean up any pending reconnect timers
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }
  
  // Set connection status to connecting
  setConnectionStatus('connecting');
  
  // Optimize the session change flow:
  // 1. Start WebSocket connection immediately (don't wait)
  // 2. Fetch chat history in parallel with the connection
  
  // Start a new WebSocket connection immediately 
  if (websocketRef.current) {
    websocketRef.current.close();
    websocketRef.current = null;
  }
  
  // Connect to WebSocket immediately without delay
  connectWebSocket();
  
  // Fetch chat history in parallel
  fetchChatHistory();
  
}, [sessionId]);

  // Function to connect WebSocket
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

  const wsProtocol = 'wss:'; // Always use secure WebSockets with Heroku
  const wsBase = process.env.NEXT_PUBLIC_API_BASE;
  const wsUrl = `${wsProtocol}//${wsBase}/ws/${userId}/${sessionId}`;
  
  console.log("Connecting to WebSocket URL:", wsUrl);

  try {
    const ws = new WebSocket(wsUrl);
    
    // Set a shorter connection timeout (3 seconds instead of 8)
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== 1) {
        console.log("WebSocket connection timeout");
        if (ws.readyState === 0) { // Still in CONNECTING state
          ws.close();
        }
      }
    }, 3000);
    
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
    
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data, 'final flag:', data.final); // Debug logging

        if (data.type === 'connection_status') {
          if (data.status === 'connected') {
            setConnectionStatus('connected');
          } else if (data.status === 'connecting') {
            setConnectionStatus('connecting');
          } else if (data.status === 'disconnected') {
            setConnectionStatus('disconnected');
          }
          return; // Skip further processing for status messages
        }

        
        switch (data.type) {
          case 'ack':
            // Acknowledgment of message receipt
            console.log(`Request ${data.requestId} acknowledged`);
            break;
            
          case 'processing_start':
            // Agents have started processing
            setAgentThinking('Squidgy is thinking...');
            break;
            
          case 'agent_thinking':
            // Update which agent is currently thinking
            setAgentThinking(`${data.agent} is thinking...`);
            break;
            
          case 'agent_update':
            // Update from an agent during processing
            setAgentThinking(`${data.agent}: ${data.message}`);
            break;

          case 'agent_response':
              // Final response from the agent
              console.log('Received agent_response with final flag:', data.final);
              
              if (data.final === true) {
                console.log('Setting loading to false because final flag is true');
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
                  console.log('Adding message to chat history:', {
                    sender: 'AI',
                    message: data.message,
                    requestId: data.requestId,
                    status: 'complete'
                  });
                  
                  setChatHistory(prevHistory => {
                    const newHistory = [
                      ...prevHistory.filter(msg => 
                        !(msg.requestId === data.requestId && msg.sender === 'AI')
                      ),
                      { 
                        sender: 'AI', 
                        message: data.message, 
                        requestId: data.requestId, 
                        status: 'complete' 
                      }
                    ];
                    console.log('New chat history after adding message:', newHistory);
                    return newHistory;
                  });
                }
                
                // Speak the response if avatar and voice are enabled
                if (avatarRef.current && videoEnabled && voiceEnabled) {
                  speakWithAvatar(data.message);
                }
              } else {
                console.log('Received agent_response without final flag set to true:', data);
              }
            break;  
            
          case 'tool_execution':
            // Tool execution started
            console.log(`Tool execution started: ${data.tool} with ID ${data.executionId}`);
            console.log(`Tool result received for tool:`, data.tool);
            console.log(`Tool result full data:`, data);
        
              // Extract URL from tool parameters if available and it's a website tool
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
            break;
            
          // Replace the existing tool_result case handler in the ws.onmessage function with this one:

          case 'tool_result':
            // Tool execution completed - handle results
            console.log(`Tool result received: ${data.executionId}`);
            
            // Process tool results based on the tool type
            if (data.executionId) {
              // Extract tool name from executionId (e.g., "screenshot-12345" -> "screenshot")
              const toolName = data.tool || data.executionId.split('-')[0];
              
              // Handle screenshot result
              if (data.tool === 'capture_website_screenshot' && data.result) {
                let screenshotPath = '';
                
                if (typeof data.result === 'object' && data.result.path) {
                  screenshotPath = data.result.path;
                } else if (typeof data.result === 'string') {
                  screenshotPath = data.result;
                }
                
                // Ensure path has the correct format
                if (screenshotPath) {
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
                
                console.log("Setting screenshot path:", screenshotPath);
                setWebsiteData(prev => ({
                  ...prev,
                  screenshot: screenshotPath
                }));
              }
              
              // Handle favicon result
              if (data.tool === 'get_website_favicon' && data.result) {
                let faviconPath = '';
                
                if (typeof data.result === 'object' && data.result.path) {
                  faviconPath = data.result.path;
                } else if (typeof data.result === 'string') {
                  faviconPath = data.result;
                }
                
                // Ensure path has the correct format
                if (faviconPath) {
                  // If path is just a filename, add the full path
                  if (!faviconPath.startsWith('/') && !faviconPath.startsWith('http')) {
                    faviconPath = `/static/favicons/${faviconPath}`;
                  }
                  
                  // If path doesn't include the backend URL, add it
                  if (faviconPath.startsWith('/static/')) {
                    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
                    faviconPath = `https://${apiBase}${faviconPath}`;
                  }
                }
                
                console.log("Setting favicon path:", faviconPath);
                setWebsiteData(prev => ({
                  ...prev,
                  favicon: faviconPath
                }));
              }
              
              // Handle perplexity analysis result
              if (data.tool === 'analyze_with_perplexity' && data.result) {
                let analysis = null;
                if (typeof data.result === 'object' && data.result.analysis) {
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
            break;
            
            case 'error':
              // Error occurred
              setLoading(false);
              setAgentThinking(null);
              
              // Clear current request ID on error
              if (currentRequestId === data.requestId) {
                setCurrentRequestId(null);
                
                // Also update the global state - ADD THIS LINE
                processingState.isProcessing = false;
                processingState.currentRequestId = null;
              }
              
              setChatHistory(prevHistory => [
                ...prevHistory,
                { 
                  sender: 'System', 
                  message: data.message || 'An error occurred while processing your request.',
                  requestId: data.requestId,
                  status: 'error'
                }
              ]);
              break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket disconnected:', event.code, event.reason);
      websocketRef.current = null;
      setConnectionStatus('disconnected');
      
      // Update the exported state when WebSocket disconnects
      processingState.websocket = null;
      
      // Use much shorter reconnect delays
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        // Exponential backoff but with much shorter times
        // 300ms, 600ms, 1200ms, etc. instead of seconds
        const reconnectDelay = Math.min(300 * 2 ** reconnectAttemptsRef.current, 5000);
        
        console.log(`Attempting to reconnect in ${reconnectDelay / 1000} seconds...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setConnectionStatus('connecting');
          connectWebSocket();
        }, reconnectDelay);
      } else {
        console.error('Max reconnection attempts reached. Please refresh the page.');
        setAgentThinking('Connection lost. Please refresh the page.');
      }
    };
    
    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      console.log('WebSocket error occurred on URL:', wsUrl);
      console.log('WebSocket readyState:', ws.readyState);
      
      // Don't update connection status here, as onclose will be called next
      // Just log that we received an error event
      
      // Show error in UI if needed
      if (ws.readyState === 3) { // CLOSED
        setAgentThinking("Cannot connect to server. Please check if the server is running.");
      }
      // The onclose handler will be called after this
    };
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

  // Effect to establish WebSocket connection on component mount
  // useEffect(() => {
  //   // connectWebSocket();
  //   const timer = setTimeout(() => {
  //     connectWebSocket();
  //   }, 300);
    
  //   // Cleanup on component unmount
  //   return () => {
  //     if (websocketRef.current) {
  //       websocketRef.current.close();
  //     }
  //     if (reconnectTimeoutRef.current) {
  //       clearTimeout(reconnectTimeoutRef.current);
  //     }
  //   };
  // }, []);

  // Function to start chat via WebSocket
  const startChat = () => {
    if (!websocketRef.current || initialMessageSent.current) {
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
    
    // Send empty message to start the conversation
    websocketRef.current.send(JSON.stringify({
      message: "",
      requestId
    }));
  };

  // Function to send a message via WebSocket
  // Find this code in Chatbot.tsx
  const sendMessage = () => {
    if (!userInput.trim()) return;
    
    // Check connection status before sending
    if (!websocketRef.current || connectionStatus !== 'connected') {
      console.log("Cannot send message: WebSocket not connected");
      // Update UI to show connection issue
      setAgentThinking("Connection issue. Attempting to reconnect...");
      // Attempt to reconnect
      connectWebSocket();
      return;
    }
    
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
    
    // Send message with timeout
    try {
      // Send message via WebSocket
      websocketRef.current.send(JSON.stringify({
        message: userInput,
        requestId
      }));
      
      // Set a timeout to reset loading state if no response is received
      const messageTimeout = setTimeout(() => {
        if (loading && currentRequestId === requestId) {
          console.log(`Message timeout for request ${requestId}`);
          setLoading(false);
          setCurrentRequestId(null);
          setAgentThinking(null);
          
          // Add timeout message to chat
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
      
      // Store the timeout ID to clear it if response is received
      // You'll need to add this to your state or ref
      messageTimeoutsRef.current[requestId] = messageTimeout;
      
      setUserInput(""); // Clear input field immediately for better UX
    } catch (error) {
      console.error("Error sending message:", error);
      setLoading(false);
      setAgentThinking(null);
      
      // Add error message to chat
      setChatHistory(prevHistory => [
        ...prevHistory,
        { 
          sender: "System", 
          message: `Error sending message: ${error.message}`, 
          requestId, 
          status: 'error' 
        }
      ]);
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
    if (!chatStarted && websocketRef.current && connectionStatus === 'connected') {
      startChat();
    }
  };

  // Function to handle new session requests - ADDING THIS WAS MISSING
  const handleNewSession = () => {
    // Generate a new session ID
    const newSessionId = `${userId}_${Date.now()}`;
    
    // Notify parent component about session change
    if (onSessionChange) {
      onSessionChange(newSessionId);
    }
  };

  // Function to handle session selection - ADDING THIS WAS MISSING
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

  useEffect(() => {
    return () => {
      // Clean up message timeouts
      Object.values(messageTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      messageTimeoutsRef.current = {};
    };
  }, []);

  // The return statement - fixed version
  return (
    <>
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
  
        <WebSocketDebugger websocket={websocketRef.current} />
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
              connectionStatus === 'connected' ? 'bg-green-600' : 
              connectionStatus === 'connecting' ? 'bg-yellow-600 animate-pulse' : 'bg-red-600'
            } text-white`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-300' : 
                connectionStatus === 'connecting' ? 'bg-yellow-300 animate-pulse' : 'bg-red-300'
              }`}></div>
              {connectionStatus === 'connected' ? 'Connected' : 
              connectionStatus === 'connecting' ? (
                // Show connection attempt count and improve message
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
          
          {/* Avatar Controls */}
          <div className="absolute top-4 right-4 z-10 flex space-x-4">
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
                  {chatHistory.map((msg, index) => {
                    console.log(`Rendering message ${index}:`, msg);
                    return (
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
                    );
                  })}
                  
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
                  connectionStatus === 'connecting' 
                    ? "Connecting to server..." 
                    : connectionStatus === 'disconnected'
                      ? "Disconnected from server..."
                      : "Type your message..."
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  // Allow sending message as soon as we're connected, even if still loading
                  if (e.key === "Enter" && connectionStatus === 'connected') {
                    sendMessage();
                  }
                }}
                // Only disable when actually disconnected
                disabled={connectionStatus === 'disconnected'}
              />
              <button
                onClick={() => {
                  if (connectionStatus !== 'connected') {
                    // Try to reconnect if disconnected
                    if (connectionStatus === 'disconnected') {
                      connectWebSocket();
                    }
                    return;
                  }
                  
                  // Always allow sending new messages when connected
                  sendMessage();
                }}
                className={`
                  text-white px-8 py-3 rounded-lg font-medium transition-colors
                  ${connectionStatus === 'connecting'
                    ? "bg-yellow-600 cursor-wait"
                    : connectionStatus === 'disconnected'
                      ? "bg-gray-600"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                `}
                disabled={connectionStatus !== 'connected'}
              >
                {connectionStatus === 'connecting' ? "Connecting..." : 
                connectionStatus === 'disconnected' ? "Disconnected" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;