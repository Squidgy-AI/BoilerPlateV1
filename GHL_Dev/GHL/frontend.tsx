"use client";

import { useState } from "react";

export default function ChatPage() {
    const [query, setQuery] = useState("");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSendMessage = async () => {
        if (!query) return;

        setLoading(true);
        setVideoUrl(null);

        try {
            const response = await fetch("/api/openai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }),
            });

            const data = await response.json();

            if (data.video_url) {
                console.log("✅ Video URL received:", data.video_url);
                setVideoUrl(data.video_url);
            } else {
                console.error("❌ Failed to fetch video URL:", data);
            }
        } catch (error) {
            console.error("❌ Error fetching video:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen bg-[#1B2B34] text-white">
            {/* Left Section */}
            <div className="flex-1 flex items-center justify-center bg-[#264653]">
                <div className="text-center">
                    <h1 className="text-5xl font-extrabold text-[#E9C46A]">CLICK</h1>
                    <h2 className="text-4xl font-bold text-[#F4A261] mt-2">HERE</h2>
                    <h3 className="text-3xl font-bold text-white mt-2">TO START</h3>
                    <p className="mt-4 text-gray-300">Let's dive in!</p>
                </div>
            </div>

            {/* Right Section (Video and Chat) */}
            <div className="w-[350px] flex flex-col items-center justify-between bg-[#2A9D8F] shadow-lg border-l border-gray-700">
                {/* Video Display */}
                <div className="w-full h-[70%] flex items-center justify-center p-2">
                    {videoUrl ? (
                        <video key={videoUrl} controls autoPlay className="rounded-lg w-full">
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <div className="text-gray-300">Waiting for video...</div>
                    )}
                </div>

                {/* Chat Input */}
                <div className="w-full p-3 flex items-center bg-[#E76F51] rounded-t-xl">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask Squidgy"
                        className="w-full p-2 bg-[#F4A261] border border-gray-500 rounded-md text-white placeholder-gray-300"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={loading}
                        className="ml-2 bg-[#E9C46A] text-white px-4 py-2 rounded-lg hover:bg-[#F4A261] transition"
                    >
                        {loading ? "..." : "▶"}
                    </button>
                </div>
            </div>
        </div>
    );
}
