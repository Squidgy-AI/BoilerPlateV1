'use client';

import React, { useState, useRef, useEffect } from 'react';
import type StreamingAvatar from "@heygen/streaming-avatar";
import { TaskMode, TaskType } from "@heygen/streaming-avatar";
import InteractiveAvatar from './InteractiveAvatar';

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
  initialTopic?: string | null; // New prop
}

const Chatbot: React.FC<ChatbotProps> = ({ userId, sessionId, onSessionChange, initialTopic }) => {
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef<boolean>(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const currentRequestIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effect to scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, agentThinking]);

  // Add to Chatbot component, inside a useEffect
// useEffect(() => {
//   // If an initial topic is provided and we're in a new session, set it as the input
//   if (initialTopic && chatHistory.length === 0) {
//     setUserInput(initialTopic);
//   }
// }, [initialTopic, chatHistory.length]);

  // Effect to reset chat when session changes
  useEffect(() => {
    initialMessageSent.current = false;
    setChatHistory([]);
    setAgentThinking(null);
    
    // Reset and reconnect WebSocket with new session ID
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Clean up any pending reconnect timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    loadChatHistory();
    connectWebSocket();
  }, [sessionId]);

  // Effect to establish WebSocket connection on component mount
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on component unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Effect to handle initialTopic
// Effect to handle initialTopic
useEffect(() => {
  // If an initial topic is provided and we're in a new session, set it as the input
  if (initialTopic && chatHistory.length === 0) {
    setUserInput(initialTopic);
    
    // Optional: Auto-send the message after a short delay
    // if (connectionStatus === 'connected' && !loading) {
    //   const timer = setTimeout(() => sendMessage(), 500);
    //   return () => clearTimeout(timer);
    // }
  }
}, [initialTopic, chatHistory.length]);

  // Function to connect WebSocket
  const connectWebSocket = () => {
    if (!userId || !sessionId) return;
    
    // Close existing connection if any
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    
    setConnectionStatus('connecting');
    
    // Use dynamic URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = process.env.NEXT_PUBLIC_API_BASE || '20.236.251.118';
    const wsUrl = `${wsProtocol}//${wsBase}/ws/${userId}/${sessionId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      websocketRef.current = ws;
      
      // If connecting for the first time, initiate chat
      if (!chatStarted && !initialMessageSent.current) {
        startChat();
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
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
            if (data.final) {
              setLoading(false);
              setAgentThinking(null);
              
              // Add the AI response to chat history
              setChatHistory(prevHistory => [
                ...prevHistory.filter(msg => msg.requestId !== data.requestId || msg.sender !== 'AI'),
                { sender: 'AI', message: data.message, requestId: data.requestId, status: 'complete' }
              ]);
              
              // Speak the response if avatar is enabled
              if (avatarRef.current && avatarEnabled) {
                speakWithAvatar(data.message);
              }
              
              // Clear current request ID
              if (currentRequestIdRef.current === data.requestId) {
                currentRequestIdRef.current = null;
              }
            }
            break;
            
          case 'error':
            // Error occurred
            setLoading(false);
            setAgentThinking(null);
            setChatHistory(prevHistory => [
              ...prevHistory,
              { 
                sender: 'System', 
                message: data.message || 'An error occurred while processing your request.',
                requestId: data.requestId,
                status: 'error'
              }
            ]);
            if (currentRequestIdRef.current === data.requestId) {
              currentRequestIdRef.current = null;
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      websocketRef.current = null;
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect if not intentionally closed and not at max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const reconnectDelay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        
        console.log(`Attempting to reconnect in ${reconnectDelay / 1000} seconds...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, reconnectDelay);
      } else {
        console.error('Max reconnection attempts reached. Please refresh the page.');
        setAgentThinking('Connection lost. Please refresh the page.');
      }
    };
    
    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      // The onclose handler will be called after this
    };
  };

  // Function to load chat history
  const loadChatHistory = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`http://20.236.251.118/chat-history?session_id=${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.history && data.history.length > 0) {
        setChatHistory(data.history.map((msg: any) => ({
          sender: msg.sender,
          message: msg.message,
          status: 'complete'
        })));
        initialMessageSent.current = true;
        setChatStarted(true);
      } else {
        // If no history found, we'll start a new chat
        // But we'll let the WebSocket connection trigger this
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // Don't auto-start chat here, let the WebSocket connection handle it
    } finally {
      setLoading(false);
    }
  };

  // Function to start chat via WebSocket
  const startChat = () => {
    if (!websocketRef.current || initialMessageSent.current) {
      return;
    }
    
    setChatStarted(true);
    initialMessageSent.current = true;
    setLoading(true);
    
    // Generate a unique request ID
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    currentRequestIdRef.current = requestId;
    
    // Send empty message to start the conversation
    websocketRef.current.send(JSON.stringify({
      message: "",
      requestId
    }));
    
    // Actual response will be handled by the onmessage handler
  };

  // Function to send a message via WebSocket
  const sendMessage = () => {
    if (!userInput.trim() || !websocketRef.current || loading) return;
    
    setLoading(true);
    setAvatarError(null);
    
    // Generate a unique request ID
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    currentRequestIdRef.current = requestId;
    
    // Add user message to chat immediately
    setChatHistory(prevHistory => [
      ...prevHistory, 
      { sender: "User", message: userInput, requestId, status: 'complete' }
    ]);
    
    // Send message via WebSocket
    websocketRef.current.send(JSON.stringify({
      message: userInput,
      requestId
    }));
    
    setUserInput(""); // Clear input field immediately for better UX
  };

  // Function to have avatar speak the message
  const speakWithAvatar = async (text: string) => {
    if (!avatarRef.current || !avatarEnabled) return;
    
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

  // Function to toggle avatar
  const toggleAvatar = () => {
    setAvatarEnabled(!avatarEnabled);
    setAvatarError(null);
  };

  // This is the completed return part, focusing on the missing sections

// The return statement starts here
return (
  <div className="w-[55%] bg-[#1E2A3B] h-screen overflow-hidden fixed right-0 top-0">
    <div className="h-full flex flex-col p-6">
      {/* Connection Status Indicator */}
      <div className="absolute top-2 left-2 z-10">
        <div className={`flex items-center px-3 py-1 rounded-full text-xs ${
          connectionStatus === 'connected' ? 'bg-green-600' : 
          connectionStatus === 'connecting' ? 'bg-yellow-600' : 'bg-red-600'
        } text-white`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            connectionStatus === 'connected' ? 'bg-green-300' : 
            connectionStatus === 'connecting' ? 'bg-yellow-300' : 'bg-red-300'
          }`}></div>
          {connectionStatus === 'connected' ? 'Connected' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      </div>
      
      {/* Avatar Video Section with Toggle Button */}
      <div className="relative h-[460px] mb-4">
        <InteractiveAvatar
          onAvatarReady={handleAvatarReady}
          avatarRef={avatarRef}
          enabled={avatarEnabled}
          sessionId={sessionId}
        />
        
        {/* Avatar Toggle Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleAvatar}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              avatarEnabled 
                ? "bg-red-600 text-white" 
                : "bg-green-600 text-white"
            }`}
          >
            {avatarEnabled ? "Disable Avatar" : "Enable Avatar"}
          </button>
        </div>
        
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
        {/* Chat History - increased height */}
        <div 
          ref={chatContainerRef}
          className="flex-1 bg-[#2D3B4F] rounded-lg overflow-y-auto mb-4 max-h-[calc(100vh-600px)]"
        >
          {loading && chatHistory.length === 0 ? (
            <div className="p-4 text-white text-center">
              Loading conversation...
            </div>
          ) : (
            <>
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
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
              connectionStatus !== 'connected' 
                ? "Reconnecting to server..." 
                : "Type your message..."
            }
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
            disabled={loading || connectionStatus !== 'connected'}
          />
          <button
            onClick={sendMessage}
            className={`${
              loading || connectionStatus !== 'connected' 
                ? "bg-gray-600" 
                : "bg-blue-600 hover:bg-blue-700"
            } text-white px-8 py-3 rounded-lg font-medium transition-colors`}
            disabled={loading || connectionStatus !== 'connected'}
          >
            {loading ? "Processing..." : 
             connectionStatus !== 'connected' ? "Connecting..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Chatbot;