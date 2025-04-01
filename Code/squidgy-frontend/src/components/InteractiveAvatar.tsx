'use client';

import React, { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";

interface InteractiveAvatarProps {
  onAvatarReady?: () => void;
  avatarRef?: React.MutableRefObject<StreamingAvatar | null>;
  enabled?: boolean;
  sessionId?: string; // Add session ID to manage avatar lifecycle with session changes
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ 
  onAvatarReady, 
  avatarRef, 
  enabled = true,
  sessionId
}) => {
  const [stream, setStream] = useState<MediaStream>();
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [avatarId] = useState<string>('Anna_public_3_20240108');
  const mediaStream = useRef<HTMLVideoElement>(null);
  const localAvatarRef = useRef<StreamingAvatar | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const tokenRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | undefined>(sessionId);

  const actualAvatarRef = avatarRef || localAvatarRef;

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      tokenRef.current = token;
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  }

  async function startAvatarSession() {
    if (!enabled) return;
    
    setIsLoadingSession(true);
    setError(null);
    setErrorType(null);
    
    try {
      // Only fetch a new token if we don't have one
      if (!tokenRef.current) {
        const token = await fetchAccessToken();
        if (!token) {
          throw new Error("Failed to obtain access token");
        }
      }
  
      // Create a new StreamingAvatar instance only if needed
      if (!actualAvatarRef.current) {
        try {
          actualAvatarRef.current = new StreamingAvatar({
            token: tokenRef.current,
          });
          setupAvatarEventListeners();
        } catch (initError) {
          console.error("Avatar initialization error:", initError);
          setError("Failed to initialize avatar");
          setErrorType("INIT_ERROR");
          throw initError;
        }
      }
  
      try {
        const res = await actualAvatarRef.current.createStartAvatar({
          quality: AvatarQuality.Low,
          avatarName: avatarId,
          voice: {
            rate: 1.2,
            emotion: VoiceEmotion.NEUTRAL,
          },
          language: "en",
          disableIdleTimeout: true,
        });
  
        await actualAvatarRef.current?.startVoiceChat({
          useSilencePrompt: false
        });
  
        setSessionActive(true);
        currentSessionIdRef.current = sessionId;
  
        if (onAvatarReady) {
          onAvatarReady();
        }
      } catch (avatarError: any) {
        console.error("Error starting avatar session:", avatarError);
        
        // Categorize errors by checking error messages
        if (avatarError.message?.includes("quota exceeded")) {
          setErrorType("QUOTA_EXCEEDED");
          setError("API quota exceeded. Try again later.");
        } else if (avatarError.message?.includes("concurrent")) {
          setErrorType("CONCURRENT_SESSION");
          setError("Another session is active. Please wait.");
        } else if (avatarError.message?.includes("WebRTC")) {
          setErrorType("WEBRTC_ERROR");
          setError("WebRTC connection failed. Check your network.");
        } else {
          setErrorType("UNKNOWN_ERROR");
          setError("Failed to start avatar session.");
        }
        
        throw avatarError;
      }
    } catch (error) {
      console.error("Avatar session error:", error);
      // Don't rethrow - we've handled it already
    } finally {
      setIsLoadingSession(false);
    }
  }

  function setupAvatarEventListeners() {
    if (!actualAvatarRef.current) return;

    actualAvatarRef.current.on(StreamingEvents.STREAM_READY, (event) => {
      console.log("Stream ready:", event.detail);
      setStream(event.detail);
    });

    actualAvatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
      console.log("Avatar started talking");
    });

    actualAvatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
      console.log("Avatar stopped talking");
    });

    actualAvatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      setSessionActive(false);
      setStream(undefined);
    });
  }

  async function pauseSession() {
    if (actualAvatarRef.current) {
      try {
        await actualAvatarRef.current.stopAvatar();
        console.log("Avatar session paused successfully");
      } catch (error) {
        console.error("Error pausing avatar session:", error);
      } finally {
        setSessionActive(false);
        setStream(undefined);
      }
    }
  }
  
  async function endSession() {
    if (actualAvatarRef.current) {
      await actualAvatarRef.current.stopAvatar();
      actualAvatarRef.current = null;
      setSessionActive(false);
      setStream(undefined);
    }
  }

  // Effect to start session initially if enabled
  useEffect(() => {
    if (enabled) {
      startAvatarSession();
    }
    
    return () => {
      endSession();
    };
  }, []);

  // Effect to handle enabled/disabled state changes
  useEffect(() => {
    if (enabled && !sessionActive) {
      startAvatarSession();
    } else if (!enabled && sessionActive) {
      pauseSession(); // Just pause instead of completely ending
    }
  }, [enabled, sessionActive]);

  // Effect to handle session changes
  useEffect(() => {
    if (sessionId !== currentSessionIdRef.current && enabled) {
      // Reset avatar when session changes
      endSession().then(() => {
        startAvatarSession();
      });
    }
  }, [sessionId, enabled]);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [stream, mediaStream]);

  return (
    <div className="w-full h-full bg-[#2D3B4F] rounded-lg overflow-hidden">
      {enabled ? (
        stream ? (
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className="w-full h-full object-cover scale-100"
          >
            <track kind="captions" />
          </video>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <div className="text-xl mb-2">
              {isLoadingSession ? "Loading avatar..." : "Avatar will appear here"}
            </div>
            
            {error && (
              <div className="text-red-400 text-sm mt-2 max-w-xs text-center">
                {error}
                {errorType === "WEBRTC_ERROR" && (
                  <button 
                    onClick={() => startAvatarSession()}
                    className="mt-2 bg-blue-500 px-4 py-1 rounded-lg"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <p className="text-xl">Avatar is disabled</p>
        </div>
      )}
    </div>
  );
};

export default InteractiveAvatar;