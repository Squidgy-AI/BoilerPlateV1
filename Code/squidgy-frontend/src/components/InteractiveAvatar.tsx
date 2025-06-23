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
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionCleanupInProgress, setSessionCleanupInProgress] = useState(false);
  const [avatarReadyState, setAvatarReadyState] = useState<'idle' | 'initializing' | 'ready' | 'failed'>('idle');
  const initializationAttemptRef = useRef<number>(0);
  const isCleaningUpRef = useRef<boolean>(false);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    
    // Prevent multiple simultaneous sessions
    if (isInitializing || sessionCleanupInProgress) {
      console.log("Avatar already initializing or cleanup in progress, skipping...");
      return;
    }
    
    // Increment attempt counter for this initialization
    const currentAttempt = ++initializationAttemptRef.current;
    console.log(`🚀 Starting avatar session attempt #${currentAttempt}`);
    
    console.log(`Starting avatar session with timeout: ${avatarTimeout}ms`);
    setIsInitializing(true);
    setIsLoadingSession(true);
    setError(null);
    setErrorType(null);
    setAvatarFailed(false);
    setShowFallback(false);
    setAvatarReadyState('initializing');
    
    // Ensure any existing session is completely ended first
    if (actualAvatarRef.current || sessionActive) {
      console.log("🔄 Ending existing session before starting new one...");
      await endSession();
      
      // Check if this attempt is still valid after cleanup
      if (currentAttempt !== initializationAttemptRef.current) {
        console.log(`🚫 Initialization attempt #${currentAttempt} canceled - newer attempt started`);
        setIsInitializing(false);
        setIsLoadingSession(false);
        return;
      }
      
      // Add a longer delay to ensure HeyGen resources are fully released
      console.log("⏱️ Waiting for HeyGen resources to be released...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Double-check if attempt is still valid after delay
      if (currentAttempt !== initializationAttemptRef.current) {
        console.log(`🚫 Initialization attempt #${currentAttempt} canceled after cleanup delay`);
        setIsInitializing(false);
        setIsLoadingSession(false);
        return;
      }
    }
    
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
        // Ensure no existing instance
        if (actualAvatarRef.current) {
          console.log("⚠️ Found existing avatar instance during initialization - cleaning up");
          actualAvatarRef.current = null;
          await new Promise(resolve => setTimeout(resolve, 500));
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
  
        // Check if this attempt is still valid
        if (currentAttempt !== initializationAttemptRef.current) {
          console.log(`🚫 Initialization attempt #${currentAttempt} canceled during success`);
          return;
        }
        
        setSessionActive(true);
        currentSessionIdRef.current = sessionId;
        currentAvatarIdRef.current = avatarId;
        setIsLoadingSession(false);
        setIsInitializing(false);
        setAvatarReadyState('ready');
  
        console.log(`✅ Avatar successfully initialized (attempt #${currentAttempt})`);
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
            
            // Check if this attempt is still valid
            if (currentAttempt !== initializationAttemptRef.current) {
              console.log(`🚫 Fallback attempt #${currentAttempt} canceled during success`);
              return;
            }
            
            setSessionActive(true);
            currentSessionIdRef.current = sessionId;
            currentAvatarIdRef.current = avatarId;
            setIsLoadingSession(false);
            setIsInitializing(false);
            setAvatarReadyState('ready');
            
            console.log(`✅ Fallback avatar configuration succeeded (attempt #${currentAttempt})`);
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
    setIsInitializing(false);
    setSessionActive(false);
    setShowFallback(true);
    setAvatarReadyState('failed');
    
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
    // Prevent multiple concurrent cleanup operations
    if (isCleaningUpRef.current) {
      console.log("🔄 Cleanup already in progress, waiting...");
      return;
    }
    
    isCleaningUpRef.current = true;
    setSessionCleanupInProgress(true);
    
    // Cancel any pending initialization
    initializationAttemptRef.current++;
    
    try {
      // Clear all timeouts
      if (avatarTimeoutRef.current) {
        clearTimeout(avatarTimeoutRef.current);
        avatarTimeoutRef.current = null;
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      if (actualAvatarRef.current) {
        console.log("🛑 Starting avatar session cleanup...");
        
        try {
          // Force cleanup after 5 seconds
          cleanupTimeoutRef.current = setTimeout(() => {
            console.log("⚠️ Forcing avatar cleanup after timeout");
            actualAvatarRef.current = null;
            setSessionActive(false);
            setStream(undefined);
            setAvatarReadyState('idle');
            tokenRef.current = "";
          }, 5000);
          
          // Only attempt to stop avatar if we have an active session
          if (sessionActive) {
            console.log("🛑 Stopping active avatar session...");
            
            // Try graceful shutdown with timeout
            await Promise.race([
              actualAvatarRef.current.stopAvatar(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Stop timeout')), 2000))
            ]);
            
            console.log("✅ Avatar session stopped successfully");
          }
          
          // Clear the forced cleanup timeout since we succeeded
          if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
          }
          
        } catch (error: any) {
          // Handle various error types gracefully
          if (error.message && error.message.includes('401')) {
            console.log("🔑 Token expired or invalid when stopping avatar - session already closed");
          } else if (error.message && error.message.includes('Stop timeout')) {
            console.log("⏰ Avatar stop operation timed out - forcing cleanup");
          } else if (error.message && error.message.includes('400')) {
            console.log("🚫 Avatar session already closed or invalid - proceeding with cleanup");
          } else {
            console.error("❌ Error stopping avatar:", error);
          }
        } finally {
          // Always clean up resources regardless of stop result
          console.log("🧹 Cleaning up avatar resources...");
          
          // Wait a moment for any pending operations to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          actualAvatarRef.current = null;
          setSessionActive(false);
          setStream(undefined);
          setAvatarReadyState('idle');
          // Clear the token so a fresh one is fetched next time
          tokenRef.current = "";
          
          // Clear any remaining timeouts
          if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
          }
          
          console.log("✅ Avatar cleanup completed");
        }
      } else {
        // No avatar to clean up, just reset states
        setSessionActive(false);
        setStream(undefined);
        setAvatarReadyState('idle');
        tokenRef.current = "";
      }
    } finally {
      isCleaningUpRef.current = false;
      setSessionCleanupInProgress(false);
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

  // Handle session changes with debouncing
  useEffect(() => {
    if (sessionId !== currentSessionIdRef.current && enabled) {
      console.log(`📱 Session changed: ${currentSessionIdRef.current} → ${sessionId}`);
      
      // Cancel any pending initialization
      initializationAttemptRef.current++;
      
      const reinitialize = async () => {
        await endSession();
        // Only start new session if this effect is still valid
        if (sessionId !== currentSessionIdRef.current && enabled) {
          await startAvatarSession();
        }
      };
      
      reinitialize();
    }
  }, [sessionId, enabled]);

  // Handle avatar ID changes with debouncing
  useEffect(() => {
    if (currentAvatarIdRef.current !== avatarId && enabled) {
      console.log(`🔄 Avatar ID changed: ${currentAvatarIdRef.current} → ${avatarId}`);
      
      // Cancel any pending initialization
      initializationAttemptRef.current++;
      
      const reinitialize = async () => {
        await endSession();
        // Only start new session if this effect is still valid
        if (currentAvatarIdRef.current !== avatarId && enabled) {
          await startAvatarSession();
        }
      };
      
      reinitialize();
    }
  }, [avatarId, enabled]);

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
          {/* Loading state with better UX */}
          {(isLoadingSession || sessionCleanupInProgress) && !avatarFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-[#2D3B4F] z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-xl mb-2">
                {sessionCleanupInProgress ? 'Switching avatar...' : 'Loading avatar...'}
              </div>
              {!sessionCleanupInProgress && (
                <>
                  <div className="text-sm text-gray-400">Using {heygenAvatarId}</div>
                  <div className="text-xs text-gray-500 mt-2">This usually takes 3-5 seconds</div>
                </>
              )}
            </div>
          )}

          {/* Video stream when available */}
          <video
            ref={mediaStream}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${
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
              className="w-full h-full object-cover"
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