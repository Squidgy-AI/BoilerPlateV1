'use client';

import React, { useState, useRef, useEffect } from 'react';
import type StreamingAvatar from "@heygen/streaming-avatar";
import { TaskMode, TaskType } from "@heygen/streaming-avatar";
import InteractiveAvatar from './InteractiveAvatar';

interface ChatMessage {
  sender: string;
  message: string;
}

interface ChatbotProps {
  userId: string;
  sessionId: string;
  onSessionChange?: (sessionId: string) => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ userId, sessionId, onSessionChange }) => {
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef<boolean>(false);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Effect to reset chat when session changes
  useEffect(() => {
    initialMessageSent.current = false;
    setChatHistory([]);
    loadChatHistory();
  }, [sessionId]);

  // Function to load chat history for the current session
  const loadChatHistory = async () => {
    setLoading(true);
    
    try {
      // You would implement this API endpoint
      const response = await fetch(`http://20.236.251.118/chat-history?session_id=${sessionId}`);
      const data = await response.json();
      
      if (data && data.history && data.history.length > 0) {
        setChatHistory(data.history);
        initialMessageSent.current = true;
        setChatStarted(true);
      } else {
        // If no history found, we'll start a new chat
        startChat();
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // If we fail to load history, start fresh
      startChat();
    } finally {
      setLoading(false);
    }
  };

  const startChat = async () => {
    // Only get the initial message if we haven't already
    if (initialMessageSent.current) {
      return;
    }
    
    setChatStarted(true);
    initialMessageSent.current = true;
    setLoading(true);
    
    try {
      const response = await fetch("http://20.236.251.118/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          user_input: "",
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setChatHistory([{ sender: "AI", message: data.agent }]);
      
      // Only attempt to use avatar if enabled
      if (avatarRef.current && avatarEnabled) {
        try {
          await avatarRef.current.speak({
            text: data.agent,
            taskType: TaskType.REPEAT,
            taskMode: TaskMode.SYNC
          });
        } catch (avatarError) {
          console.error("Avatar speak error:", avatarError);
          setAvatarError("Failed to activate avatar speech. Text response still available.");
          // Don't fail the whole interaction if avatar fails
        }
      }
    } catch (error) {
      console.error("Error fetching first question:", error);
      setChatHistory([{ 
        sender: "System", 
        message: "Failed to start chat. Please try again or reload the page." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    setAvatarError(null);
    
    // Add user message to chat immediately
    setChatHistory(prevHistory => [...prevHistory, { sender: "User", message: userInput }]);
    
    const currentInput = userInput;
    setUserInput(""); // Clear input field immediately for better UX
    
    try {
      const response = await fetch("http://20.236.251.118/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          user_input: currentInput,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();

      setChatHistory(prevHistory => [...prevHistory, { sender: "AI", message: data.agent }]);
      
      // Decoupled avatar handling - only attempt if enabled
      if (avatarRef.current && avatarEnabled) {
        try {
          await avatarRef.current.speak({
            text: data.agent,
            taskType: TaskType.REPEAT,
            taskMode: TaskMode.SYNC
          });
        } catch (avatarError) {
          console.error("Avatar speak error:", avatarError);
          setAvatarError("Failed to activate avatar speech. Text response still available.");
          // Don't fail the whole interaction if avatar fails
        }
      }
    } catch (error) {
      console.error("API Error:", error);
      setChatHistory(prevHistory => [...prevHistory, { 
        sender: "System", 
        message: "Error communicating with AI Assistant. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarReady = () => {
    console.log("Avatar is ready");
    if (!chatStarted) {
      startChat();
    }
  };

  const toggleAvatar = () => {
    setAvatarEnabled(!avatarEnabled);
    setAvatarError(null);
  };

  return (
    <div className="w-[55%] bg-[#1E2A3B] h-screen overflow-hidden fixed right-0 top-0">
      <div className="h-full flex flex-col p-6">
        {/* Avatar Video Section with Toggle Button */}
        <div className="relative h-[460px] mb-4">
          <InteractiveAvatar
            onAvatarReady={handleAvatarReady}
            avatarRef={avatarRef}
            enabled={avatarEnabled}
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
              chatHistory.map((msg, index) => (
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
              ))
            )}
          </div>

          {/* Input Section */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-[#2D3B4F] text-white rounded-lg px-4 py-3"
              placeholder="Type your message..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              className={`${
                loading ? "bg-gray-600" : "bg-blue-600 hover:bg-blue-700"
              } text-white px-8 py-3 rounded-lg font-medium transition-colors`}
              disabled={loading}
            >
              {loading ? "Loading..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;