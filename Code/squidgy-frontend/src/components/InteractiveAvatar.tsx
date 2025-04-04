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
  sessionId?: string;
  voiceEnabled?: boolean;
  avatarId?: string; // New prop to specify which avatar to use
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ 
  onAvatarReady, 
  avatarRef, 
  enabled = true,
  sessionId,
  voiceEnabled = true,
  avatarId = 'Anna_public_3_20240108' // Default value
}) => {
  const [stream, setStream] = useState<MediaStream>();
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const mediaStream = useRef<HTMLVideoElement>(null);
  const localAvatarRef = useRef<StreamingAvatar | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const tokenRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | undefined>(sessionId);
  const currentAvatarIdRef = useRef<string>(avatarId);

  // Dynamic fallback image based on selected avatar
  const fallbackImagePath = avatarId === 'sol' ? "/sol.jpg" : "/seth.JPG";

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
          avatarName: avatarId, // Use the avatarId prop
          voice: {
            rate: 1.2,
            emotion: VoiceEmotion.NEUTRAL,
          },
          language: "en",
          disableIdleTimeout: true,
        });
  
        // Only start voice chat if voice is enabled
        if (voiceEnabled) {
          await actualAvatarRef.current?.startVoiceChat({
            useSilencePrompt: false
          });
        }
  
        setSessionActive(true);
        currentSessionIdRef.current = sessionId;
        currentAvatarIdRef.current = avatarId;
  
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

  // Effect to handle avatar ID changes
  useEffect(() => {
    if (sessionActive && currentAvatarIdRef.current !== avatarId) {
      // Need to reset the session when avatar changes
      endSession().then(() => {
        startAvatarSession();
      });
    } else if (!sessionActive && enabled) {
      // Start session if not active but should be enabled
      startAvatarSession();
    }
  }, [avatarId, enabled]);

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

  // Effect to handle voice enabled/disabled changes
  useEffect(() => {
    // If session is active and avatar exists, update voice settings
    if (sessionActive && actualAvatarRef.current) {
      // If voice was disabled but now enabled
      if (voiceEnabled && actualAvatarRef.current) {
        actualAvatarRef.current.startVoiceChat({
          useSilencePrompt: false
        }).catch(error => {
          console.error("Error starting voice chat:", error);
        });
      }
      // If voice was enabled but now disabled, we don't need to do anything special
      // as the voice will only be used when speakWithAvatar is called
    }
  }, [voiceEnabled, sessionActive]);

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
    <div className="w-full h-full bg-[#2D3B4F] rounded-lg overflow-hidden relative">
      {enabled ? (
        <>
          {stream ? (
            <video
              ref={mediaStream}
              autoPlay
              playsInline
              className="w-full h-full object-contain scale-90"
            >
              <track kind="captions" />
            </video>
          ) : (
            <>
              {/* Fallback image when avatar fails to load */}
              {!isLoadingSession && error && (
                <div className="w-full h-full">
                  <img 
                    src={fallbackImagePath} 
                    alt="Avatar fallback" 
                    className="w-full h-full object-contain scale-90"
                  />
                  <div className="absolute bottom-4 left-0 right-0 text-red-400 text-sm bg-black bg-opacity-70 p-2 text-center">
                    {error}
                    {errorType === "WEBRTC_ERROR" && (
                      <button 
                        onClick={() => startAvatarSession()}
                        className="ml-2 bg-blue-500 px-4 py-1 rounded-lg"
                      >
                        Retry Connection
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoadingSession && (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <div className="text-xl mb-2">Loading avatar...</div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <p className="text-xl">Avatar is disabled</p>
        </div>
      )}
    </div>
  );
};

export default InteractiveAvatar;