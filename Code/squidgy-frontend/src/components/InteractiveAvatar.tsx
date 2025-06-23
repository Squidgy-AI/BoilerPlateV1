'use client';

import React, { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import { getHeygenAvatarId, getFallbackAvatar, getValidatedAvatarId } from '@/config/agents';

interface InteractiveAvatarProps {
  onAvatarReady?: () => void;
  avatarRef?: React.MutableRefObject<StreamingAvatar | null>;
  enabled?: boolean;
  sessionId?: string;
  voiceEnabled?: boolean;
  avatarId?: string;
  onAvatarError?: (error: string) => void;
  avatarTimeout?: number;
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ 
  onAvatarReady, 
  avatarRef, 
  enabled = true,
  sessionId,
  voiceEnabled = true,
  avatarId = 'presaleskb',
  onAvatarError,
  avatarTimeout = 10000 // 10 seconds default timeout
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
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const actualAvatarRef = avatarRef || localAvatarRef;

  // Get the actual HeyGen avatar ID with validation
  const heygenAvatarId = getValidatedAvatarId(avatarId);
  
  // Get the appropriate fallback image
  const fallbackImagePath = getFallbackAvatar(avatarId);

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
    
    console.log(`Starting avatar session with timeout: ${avatarTimeout}ms`);
    setIsLoadingSession(true);
    setError(null);
    setErrorType(null);
    setAvatarFailed(false);
    setShowFallback(false);
    
    // Set timeout for avatar initialization
    avatarTimeoutRef.current = setTimeout(() => {
      console.log("Avatar initialization timeout reached - using fallback");
      handleAvatarFailure("Avatar loading timed out - using fallback image");
    }, avatarTimeout);
    
    try {
      // Always fetch a fresh token for each new session
      const token = await fetchAccessToken();
      if (!token) {
        throw new Error("Failed to obtain access token");
      }
      tokenRef.current = token;
  
      // Always create a new StreamingAvatar instance with fresh token
      try {
        // Clean up any existing instance first
        if (actualAvatarRef.current) {
          actualAvatarRef.current = null;
        }
        
        actualAvatarRef.current = new StreamingAvatar({
          token: tokenRef.current,
        });
        setupAvatarEventListeners();
      } catch (initError) {
        console.error("Avatar initialization error:", initError);
        handleAvatarFailure("Failed to initialize avatar");
        return;
      }
  
      try {
        // Use the correct parameters based on HeyGen SDK documentation
        const avatarConfig = {
          quality: AvatarQuality.Low,
          avatarName: heygenAvatarId,
          voice: {
            rate: 1.2,
            emotion: VoiceEmotion.NEUTRAL,
          },
          language: "en",
          disableIdleTimeout: true,
        };
        
        console.log('Starting avatar with config:', avatarConfig);
        console.log('Using HeyGen avatar ID:', heygenAvatarId);
        
        const result = await actualAvatarRef.current.createStartAvatar(avatarConfig);
        console.log('Avatar start result:', result);
  
        // Only start voice chat if voice is enabled
        if (voiceEnabled) {
          await actualAvatarRef.current?.startVoiceChat({
            useSilencePrompt: false
          });
        }
  
        // Clear timeout on success
        if (avatarTimeoutRef.current) {
          clearTimeout(avatarTimeoutRef.current);
          avatarTimeoutRef.current = null;
        }
  
        setSessionActive(true);
        currentSessionIdRef.current = sessionId;
        currentAvatarIdRef.current = avatarId;
        setIsLoadingSession(false);
  
        console.log("Avatar successfully initialized");
        if (onAvatarReady) {
          onAvatarReady();
        }
      } catch (avatarError: any) {
        console.error("Error starting avatar session:", avatarError);
        
        // Handle specific API errors
        if (avatarError.message && avatarError.message.includes('400')) {
          console.error("400 Error Details:", {
            error: avatarError,
            avatarId: heygenAvatarId,
            token: tokenRef.current ? 'Present' : 'Missing',
            config: {
              quality: AvatarQuality.Low,
              avatarName: heygenAvatarId,
              voice: {
                rate: 1.2,
                emotion: VoiceEmotion.NEUTRAL,
              },
              language: "en",
              disableIdleTimeout: true,
            }
          });
          
          // Try with a different avatar configuration
          console.log("Attempting fallback avatar configuration...");
          try {
            const fallbackConfig = {
              quality: AvatarQuality.Medium,
              avatarName: heygenAvatarId,
              language: "en",
              disableIdleTimeout: false,
            };
            
            console.log('Trying fallback config:', fallbackConfig);
            const fallbackResult = await actualAvatarRef.current.createStartAvatar(fallbackConfig);
            console.log('Fallback avatar start result:', fallbackResult);
            
            // If fallback succeeds, continue with voice chat
            if (voiceEnabled) {
              await actualAvatarRef.current?.startVoiceChat({
                useSilencePrompt: false
              });
            }
            
            // Clear timeout on success
            if (avatarTimeoutRef.current) {
              clearTimeout(avatarTimeoutRef.current);
              avatarTimeoutRef.current = null;
            }
            
            setSessionActive(true);
            currentSessionIdRef.current = sessionId;
            currentAvatarIdRef.current = avatarId;
            setIsLoadingSession(false);
            
            console.log("Fallback avatar configuration succeeded");
            if (onAvatarReady) {
              onAvatarReady();
            }
            return; // Exit successfully
          } catch (fallbackError) {
            console.error("Fallback configuration also failed:", fallbackError);
          }
        }
        
        handleAvatarFailure(avatarError.message || "Failed to start avatar session");
      }
    } catch (error: any) {
      console.error("Avatar session error:", error);
      handleAvatarFailure(error.message || "Avatar session error");
    }
  }

  function handleAvatarFailure(errorMessage: string) {
    console.log("Avatar failed, using fallback:", errorMessage);
    
    // Clear timeout if still pending
    if (avatarTimeoutRef.current) {
      clearTimeout(avatarTimeoutRef.current);
      avatarTimeoutRef.current = null;
    }
    
    setError(errorMessage);
    setAvatarFailed(true);
    setIsLoadingSession(false);
    setSessionActive(false);
    setShowFallback(true);
    
    if (onAvatarError) {
      onAvatarError(errorMessage);
    }
    
    // Still call onAvatarReady to proceed with chat
    if (onAvatarReady) {
      onAvatarReady();
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
      setShowFallback(true);
    });
  }

  async function endSession() {
    // Clear timeout if still pending
    if (avatarTimeoutRef.current) {
      clearTimeout(avatarTimeoutRef.current);
      avatarTimeoutRef.current = null;
    }
    
    if (actualAvatarRef.current) {
      try {
        // Only attempt to stop avatar if we have an active session
        if (sessionActive) {
          await actualAvatarRef.current.stopAvatar();
        }
      } catch (error: any) {
        // Handle 401 error gracefully
        if (error.message && error.message.includes('401')) {
          console.log("Token expired or invalid when stopping avatar - session already closed");
        } else {
          console.error("Error stopping avatar:", error);
        }
      } finally {
        // Always clean up resources regardless of stop result
        actualAvatarRef.current = null;
        setSessionActive(false);
        setStream(undefined);
        // Clear the token so a fresh one is fetched next time
        tokenRef.current = "";
      }
    }
  }

  // Main initialization effect
  useEffect(() => {
    if (enabled) {
      startAvatarSession();
    }
    
    return () => {
      endSession();
    };
  }, [enabled]);

  // Handle session changes
  useEffect(() => {
    if (sessionId !== currentSessionIdRef.current && enabled) {
      console.log("Session changed, reinitializing avatar");
      endSession().then(() => {
        startAvatarSession();
      });
    }
  }, [sessionId, enabled]);

  // Handle avatar ID changes
  useEffect(() => {
    if (sessionActive && currentAvatarIdRef.current !== avatarId) {
      console.log("Avatar ID changed, reinitializing");
      endSession().then(() => {
        startAvatarSession();
      });
    }
  }, [avatarId]);

  // Handle voice enabled changes
  useEffect(() => {
    if (sessionActive && actualAvatarRef.current) {
      if (voiceEnabled && actualAvatarRef.current) {
        actualAvatarRef.current.startVoiceChat({
          useSilencePrompt: false
        }).catch(error => {
          console.error("Error starting voice chat:", error);
        });
      }
    }
  }, [voiceEnabled, sessionActive]);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        // Hide fallback when stream is playing
        setShowFallback(false);
      };
    }
  }, [stream, mediaStream]);

  return (
    <div className="w-full h-full bg-[#2D3B4F] rounded-lg overflow-hidden relative">
      {enabled ? (
        <>
          {/* Loading state */}
          {isLoadingSession && !avatarFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-[#2D3B4F] z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-xl mb-2">Loading avatar...</div>
              <div className="text-sm text-gray-400">This may take up to {avatarTimeout/1000} seconds</div>
              <div className="text-xs text-gray-500 mt-2">If this takes too long, we'll use a fallback image</div>
            </div>
          )}

          {/* Video stream when available */}
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className={`w-full h-full object-contain scale-90 ${
              stream && !showFallback ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-500`}
            style={{ display: stream && !showFallback ? 'block' : 'none' }}
          >
            <track kind="captions" />
          </video>

          {/* Fallback image - Always rendered but hidden when stream is active */}
          <div 
            className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center ${
              (!stream || showFallback) && !isLoadingSession ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-500`}
            style={{ display: (!stream || showFallback) && !isLoadingSession ? 'flex' : 'none' }}
          >
            <img 
              src={fallbackImagePath} 
              alt="Agent" 
              className="w-full h-full object-contain scale-90"
            />
            {avatarFailed && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="bg-black bg-opacity-70 text-yellow-400 text-sm p-2 rounded mx-4">
                  Using fallback image (Avatar temporarily unavailable)
                </div>
              </div>
            )}
          </div>
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