'use client';

import React, { useState, useRef, useEffect } from 'react';
import type StreamingAvatar from "@heygen/streaming-avatar";
import { TaskMode, TaskType } from "@heygen/streaming-avatar";
import InteractiveAvatar from './InteractiveAvatar';

interface ChatMessage {
  sender: string;
  message: string;
}

const Chatbot = () => {
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [userId] = useState(Math.random().toString(36).substring(7));
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const startChat = async () => {
    setChatStarted(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_input: "",
        }),
      });
      const data = await response.json();
      setChatHistory([{ sender: "AI", message: data.agent }]);
      
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: data.agent,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC
        });
      }
    } catch (error) {
      console.error("Error fetching first question:", error);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    setChatHistory([...chatHistory, { sender: "User", message: userInput }]);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_input: userInput,
        }),
      });
      const data = await response.json();

      setChatHistory((prevHistory) => [...prevHistory, { sender: "AI", message: data.agent }]);
      
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: data.agent,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error communicating with AI Assistant.");
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  const handleAvatarReady = () => {
    console.log("Avatar is ready");
    if (!chatStarted) {
      startChat();
    }
  };

  return (
    <div className="w-1/2 bg-[#1E2A3B] h-screen overflow-hidden fixed right-0 top-0">
      <div className="h-full flex flex-col p-6">
        {/* Avatar Video Section */}
        <div className="h-[500px] mb-4">
          <InteractiveAvatar
            onAvatarReady={handleAvatarReady}
            avatarRef={avatarRef}
          />
        </div>

        {/* Chat History and Input Section */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat History */}
          <div 
          ref={chatContainerRef}
          className="flex-1 bg-[#2D3B4F] rounded-lg overflow-y-auto mb-4">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className="p-4 border-b border-gray-700"
              >
                <span className="font-bold text-blue-400">{msg.sender}: </span>
                <span className="text-white">{msg.message}</span>
              </div>
            ))}
          </div>

          {/* Input Section */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-[#2D3B4F] text-white rounded-lg px-4 py-3"
              placeholder="Type your message..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium"
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