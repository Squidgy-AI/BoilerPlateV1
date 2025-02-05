"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

interface ChatMessage {
  sender: string;
  message: string;
}

const Chatbot: React.FC = () => {
  const [userInput, setUserInput] = useState<string>("");
  const [chatStarted, setChatStarted] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId] = useState<string>(Math.random().toString(36).substring(7));
  const [subtitle, setSubtitle] = useState<string>("");

  useEffect(() => {
    if (chatHistory.length > 0) {
      setSubtitle(chatHistory[chatHistory.length - 1].message);
    }
  }, [chatHistory]);

  const startChat = async () => {
    setChatStarted(true);
    try {
      const response = await axios.post<{ agent: string }>("http://127.0.0.1:8000/conversation", {
        user_id: userId,
        user_input: "",
      });
      setChatHistory([{ sender: "AI", message: response.data.agent }]);
    } catch (error) {
      console.error("Error fetching first question:", error);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    setChatHistory([...chatHistory, { sender: "User", message: userInput }]);

    try {
      const response = await axios.post<{ agent: string; video_url?: string }>("http://127.0.0.1:8000/conversation", {
        user_id: userId,
        user_input: userInput,
      });

      setChatHistory((prevHistory) => [...prevHistory, { sender: "AI", message: response.data.agent }]);
      if (response.data.video_url) {
        setVideoUrl(response.data.video_url);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error communicating with AI Assistant.");
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-auto">
      {/* Left Section */}
      <div className="flex-1 bg-[#1D3B45] flex flex-col items-center justify-center text-center text-white p-10">
        {!chatStarted ? (
          <div className="cursor-pointer hover:scale-105 transition" onClick={startChat}>
            <h1 className="text-5xl font-bold text-yellow-400">CLICK</h1>
            <h2 className="text-4xl font-bold text-orange-400">HERE</h2>
            <h3 className="text-3xl">TO START</h3>
            <p className="mt-2">Let's dive in!</p>
          </div>
        ) : (
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold">Welcome to Squidgy</h1>
            <p className="mt-4 text-lg">Squidgy provides high-quality solar solutions to meet your energy needs. Our AI assistant is here to guide you through the process.</p>
          </div>
        )}
      </div>

      {/* Right Section - Video Area with Chat Display */}
      <div className="w-1/4 bg-[#2CA6A4] flex flex-col justify-between p-6 relative overflow-auto">
        {videoUrl ? (
          <div className="relative w-full">
            <video controls className="w-full rounded-lg shadow-md">
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full text-center">
              {chatHistory.length > 0 && (
                <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg text-lg max-w-xs mx-auto overflow-auto max-h-40">
                  {chatHistory.map((msg, index) => (
                    <p key={index} className={msg.sender === "User" ? "text-blue-300" : "text-yellow-300"}>
                      <strong>{msg.sender}:</strong> {msg.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-lg">Your AI-generated video will appear here.</p>
          </div>
        )}
        <div className="absolute bottom-4 w-full flex justify-center">
          <input
            type="text"
            className="w-3/4 p-3 rounded-lg border border-gray-600 bg-gray-800 text-white"
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="ml-3 bg-orange-700 text-white px-5 py-3 rounded-lg shadow-md hover:bg-orange-800 transition"
            disabled={loading}
          >
            {loading ? "Loading..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
