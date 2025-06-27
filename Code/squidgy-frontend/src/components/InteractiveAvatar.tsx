'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import { getHeygenAvatarId, getFallbackAvatar, getValidatedAvatarId } from '@/config/agents';

// Define VoiceChatTransport enum locally since it may not be exported
enum VoiceChatTransport {
  WEBSOCKET = "websocket",
  WEBRTC = "webrtc",
  LIVEKIT = "livekit"
}

// Type definition for event handler function to avoid TypeScript errors
type EventHandler = (avatar: any, eventName: string, callback: (event?: any) => void) => void;

// Create a safe event handler function that works with any event name
const safeAddEventListener: EventHandler = (avatar, eventName, callback) => {
  // @ts-ignore - Using string event names for compatibility
  avatar.on(eventName, callback);
};

// Constants for session management and credit optimization
const SESSION_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const DEBOUNCE_DELAY_MS = 500; // 500ms debounce for initialization

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
  // State management
  const [stream, setStream] = useState<MediaStream>();
  const [error, setError] = useState<string>("");
  const [errorType, setErrorType] = useState<string>("");
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);
  const [fallbackAvatarUrl, setFallbackAvatarUrl] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Refs for managing avatar state and preventing race conditions
  const localAvatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentSessionIdRef = useRef<string | undefined>(sessionId);
  const currentAvatarIdRef = useRef<string | undefined>(avatarId);
  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceChatActiveRef = useRef<boolean>(false);
  const initializationInProgressRef = useRef<boolean>(false);
  const lastInitAttemptTimeRef = useRef<number>(0);
  const lastActivityTimeRef = useRef<number>(Date.now()); // Track last user activity

  // Constants for credit optimization
  const SESSION_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
  const DEBOUNCE_DELAY_MS = 500; // 500ms

  // Handle avatar failures consistently
  const handleAvatarFailure = useCallback((error: any) => {
    console.error('Avatar failure:', error);
    
    // Check if it's a concurrent limit error
    if (error?.responseText && error.responseText.includes('Concurrent limit reached')) {
      console.warn('🚫 HeyGen concurrent limit reached - this is an API limitation, not a code issue');
      console.log('💡 Solution: Wait a few minutes for existing sessions to expire, or upgrade HeyGen plan');
      setError('HeyGen concurrent limit reached. Please wait a few minutes or upgrade your plan.');
      setErrorType('concurrent_limit');
    } else {
      setError(error?.message || 'Avatar initialization failed');
      setErrorType('avatar_failure');
    }
    
    setAvatarFailed(true);
    
    // Load fallback avatar image
    setFallbackAvatarUrl(getFallbackAvatar(avatarId || 'presaleskb'));
    
    if (onAvatarError) {
      onAvatarError(error?.message || 'Avatar initialization failed');
    }
  }, [avatarId, onAvatarError]);

  // End session and clean up resources to save credits
  const endSession = useCallback(async () => {
    console.log('🧹 Ending session to save credits');
    
    // Clear monitoring interval
    if (sessionMonitorIntervalRef.current) {
      clearInterval(sessionMonitorIntervalRef.current);
      sessionMonitorIntervalRef.current = null;
    }
    
    // Stop voice chat if active
    if (voiceChatActiveRef.current && localAvatarRef.current) {
      try {
        // Cast to any to access undocumented method
        (localAvatarRef.current as any).stopVoiceChat?.();
        console.log('🔇 Voice chat stopped');
        voiceChatActiveRef.current = false;
      } catch (err) {
        // Don't log 401 errors as they're expected when session wasn't properly created
        if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string' && !(err as any).message.includes('401')) {
          console.error('Error stopping voice chat:', err);
        }
      }
    }
    
    // Clean up avatar instance only if session is active
    if (localAvatarRef.current) {
      try {
        // Use stopAvatar method instead of destroy for proper cleanup
        await (localAvatarRef.current as any).stopAvatar?.();
        console.log('🛑 Avatar session stopped');
      } catch (err) {
        // Don't log 401 errors as they're expected when session wasn't properly created
        if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string' && !(err as any).message.includes('401')) {
          console.error('Error stopping avatar:', err);
        }
      }
    }
    
    // Reset refs and state
    localAvatarRef.current = null;
    if (avatarRef) {
      avatarRef.current = null;
    }
    setSessionActive(false);
    setStream(undefined);
    setAvatarFailed(false);
    setError('');
    setErrorType('');
    setIsTransitioning(false);
    sessionStartTimeRef.current = null;
    currentSessionIdRef.current = undefined;
    currentAvatarIdRef.current = undefined;
    console.log('✅ Session cleanup complete');
  }, []);

  // Force cleanup function for concurrent limit issues
  const forceCleanupAllSessions = useCallback(async () => {
    console.log('🚨 Force cleanup initiated due to concurrent limit');
    
    // Try to clean up any existing avatar instances
    if (localAvatarRef.current) {
      try {
        await (localAvatarRef.current as any).stopAvatar?.();
        console.log('🛑 Forced avatar session cleanup');
      } catch (err) {
        console.log('⚠️ Force cleanup attempt completed (errors expected)');
      }
    }
    
    // Reset all state
    localAvatarRef.current = null;
    setSessionActive(false);
    setStream(undefined);
    sessionStartTimeRef.current = null;
    voiceChatActiveRef.current = false;
    initializationInProgressRef.current = false;
    
    if (sessionMonitorIntervalRef.current) {
      clearInterval(sessionMonitorIntervalRef.current);
      sessionMonitorIntervalRef.current = null;
    }
    
    console.log('🧹 Force cleanup complete - wait 2-3 minutes before retrying');
  }, []);

  // Update activity timestamp when user interacts
  const updateActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    console.log("👤 User activity detected - idle timeout reset");
  }, []);

  // Setup avatar event listeners
  const setupAvatarEventListeners = useCallback((avatar: StreamingAvatar) => {
    console.log("Setting up comprehensive event listeners...");
    
    // Use safeAddEventListener to avoid TypeScript errors
    safeAddEventListener(avatar, 'stream_ready', (event: any) => {
      console.log("🎥 Stream ready event received:", event.detail);
      
      // Validate the stream
      if (event.detail && event.detail instanceof MediaStream) {
        console.log("✅ Valid MediaStream received with", event.detail.getTracks().length, "tracks");
        event.detail.getTracks().forEach((track: MediaStreamTrack, index: number) => {
          console.log(`Track ${index}: ${track.kind} - ${track.label} (enabled: ${track.enabled})`);
        });
        setStream(event.detail);
        console.log("📺 Stream state updated, video should now be visible");
        
        // Notify parent component that avatar is ready and video is visible
        if (onAvatarReady) {
          console.log("🎯 Calling onAvatarReady - video stream is now visible");
          onAvatarReady();
        }
      } else {
        console.warn("⚠️ Invalid stream received:", event.detail);
      }
    });
    
    safeAddEventListener(avatar, 'avatar_start_talking', () => {
      console.log("🗣️ Avatar started talking");
      updateActivity(); // Track activity when avatar responds
    });
    
    safeAddEventListener(avatar, 'avatar_stop_talking', () => {
      console.log("😐 Avatar stopped talking");
    });
    
    safeAddEventListener(avatar, 'voice_chat_started', () => {
      console.log("🎙️ Voice chat started");
      voiceChatActiveRef.current = true;
      updateActivity(); // Track activity when voice chat starts
    });
    
    safeAddEventListener(avatar, 'voice_chat_stopped', () => {
      console.log("🔇 Voice chat stopped");
      voiceChatActiveRef.current = false;
    });
    
    // Add user speaking detection to prevent idle timeout during conversation
    safeAddEventListener(avatar, 'user_start_talking', () => {
      console.log("🎤 User started talking");
      updateActivity(); // Track activity when user speaks
    });
    
    safeAddEventListener(avatar, 'user_stop_talking', () => {
      console.log("🤐 User stopped talking");
      updateActivity(); // Track activity when user finishes speaking
    });
    
    // Also track any audio input activity
    safeAddEventListener(avatar, 'audio_input', () => {
      updateActivity(); // Track activity on any audio input
    });
    
    safeAddEventListener(avatar, 'stream_disconnected', () => {
      console.log("Stream disconnected");
      setStream(undefined);
    });
    
    safeAddEventListener(avatar, 'error', (event: any) => {
      console.error("Avatar error:", event);
      handleAvatarFailure(event);
    });
  }, [handleAvatarFailure, updateActivity, onAvatarReady]);

  // Initialize avatar with credit-saving optimizations using LiveKit
  const initializeAvatar = useCallback(async (sessionId: string, avatarId: string) => {
    // Prevent multiple initializations
    if (initializationInProgressRef.current) {
      console.log("🔄 Avatar initialization already in progress, skipping...");
      return;
    }
    
    // Update initialization state
    initializationInProgressRef.current = true;
    lastInitAttemptTimeRef.current = Date.now();
    
    // Set up a timeout to prevent forever loading
    const initTimeout = setTimeout(() => {
      if (initializationInProgressRef.current) {
        console.log("⏱️ Avatar initialization timeout - forcing failure");
        handleAvatarFailure(new Error("Avatar initialization timeout"));
        initializationInProgressRef.current = false;
      }
    }, 15000); // 15 second timeout
    
    try {
      console.log("🚀 Initializing avatar with session ID:", sessionId, "and avatar ID:", avatarId);
      console.log("📊 Session State - Active:", sessionActive, "Failed:", avatarFailed);
      
      // IMPORTANT: Force cleanup of any existing session when avatar changes
      if (sessionActive || localAvatarRef.current) {
        console.log("🧹 Force cleaning up existing avatar session before creating new one");
        await endSession();
        // Add a small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Get token from API
      const response = await fetch('/api/get-access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Token API response status:", response.status);
      console.log("Token API response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log("Raw token API response:", responseText);
      
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse token response as JSON:", parseError);
        throw new Error(`Invalid JSON response from token API: ${responseText.substring(0, 100)}...`);
      }
      
      const { token } = tokenData;
      if (!token) {
        throw new Error('No token received from API');
      }
      
      console.log("Successfully received access token");
      
      // Create new avatar instance with LiveKit transport
      const avatar = new StreamingAvatar({
        token,
        // Use LiveKit instead of WebSocket to avoid conflicts with backend WebSocket
        // @ts-ignore - transport is required but not in type definition
        transport: VoiceChatTransport.LIVEKIT,
        element: videoRef.current as HTMLVideoElement,
      });
      
      // Set up event listeners
      setupAvatarEventListeners(avatar);
      
      // Store avatar instance in refs
      localAvatarRef.current = avatar;
      if (avatarRef) {
        avatarRef.current = avatar;
      }
      
      // Start avatar with credit-saving optimizations using LiveKit
      try {
        const validatedAvatarId = getValidatedAvatarId(avatarId);
        console.log("🎭 Starting avatar with:", {
          agentId: avatarId,
          validatedAvatarId: validatedAvatarId,
          heygenId: getHeygenAvatarId(avatarId)
        });
        
        // @ts-ignore - createStartAvatar method exists but may not be in type definition
        const startResponse = await avatar.createStartAvatar({
          avatarName: validatedAvatarId,
          quality: AvatarQuality.Low,
          voice: {
            rate: 1.0,
            emotion: VoiceEmotion.NEUTRAL
          },
          language: 'en' // Required by StartAvatarOptions
        });
        
        console.log("Avatar createStartAvatar response:", startResponse);
        
        // Check if the response is valid
        if (startResponse && typeof startResponse === 'object') {
          console.log("Avatar created and started successfully");
        } else {
          console.warn("Avatar createStartAvatar response was unexpected:", startResponse);
        }
        
        // Add delay to ensure WebSocket connection is fully established before any voice operations
        console.log("Waiting for WebSocket connection to stabilize...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        console.log("WebSocket stabilization period complete");
        
        // Start voice chat after stabilization
        try {
          console.log("🎙️ Starting voice chat...");
          // @ts-ignore - startVoiceChat method exists but may not be in type definition
          await avatar.startVoiceChat();
          voiceChatActiveRef.current = true;
          console.log("✅ Voice chat started successfully");
        } catch (voiceError) {
          console.warn("⚠️ Voice chat failed to start (will retry later):", voiceError);
          // Don't fail the entire initialization if voice chat fails
        }
        
      } catch (error) {
        console.error("Avatar initialization failed:", error);
        
        // If it's a concurrent limit error, trigger force cleanup
        if (error && typeof error === 'object' && 'responseText' in error && 
            typeof error.responseText === 'string' && error.responseText.includes('Concurrent limit reached')) {
          console.log('🚨 Concurrent limit detected - triggering force cleanup');
          await forceCleanupAllSessions();
        }
        
        handleAvatarFailure(error);
        
        // Don't set up duplicate retry here since handleAvatarFailure already handles it
        return;
      }
      
      // Update state and refs
      setSessionActive(true);
      setAvatarFailed(false);
      setError('');
      setIsTransitioning(false);
      currentSessionIdRef.current = sessionId;
      currentAvatarIdRef.current = avatarId;
      sessionStartTimeRef.current = Date.now();
      
      // Set up session monitoring to prevent long-running sessions
      if (sessionMonitorIntervalRef.current) {
        clearInterval(sessionMonitorIntervalRef.current);
      }
      
      sessionMonitorIntervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const sessionDuration = sessionStartTimeRef.current ? currentTime - sessionStartTimeRef.current : 0;
        const idleDuration = currentTime - lastActivityTimeRef.current;
        console.log(`⏱️ Session Monitor - Duration: ${Math.round(sessionDuration / 1000)}s / ${SESSION_MAX_DURATION_MS / 1000}s max, Idle: ${Math.round(idleDuration / 1000)}s / ${IDLE_TIMEOUT_MS / 1000}s max`);
        
        // If voice chat is active, consider it as activity to prevent timeout
        if (voiceChatActiveRef.current) {
          console.log("🎙️ Voice chat active - preventing idle timeout");
          updateActivity();
        }
        
        if (sessionStartTimeRef.current && sessionDuration > SESSION_MAX_DURATION_MS) {
          console.log("⚠️ Session exceeding max duration, restarting to save credits");
          initializeAvatar(sessionId, avatarId).catch(handleAvatarFailure);
        } else if (idleDuration > IDLE_TIMEOUT_MS) {
          console.log("⚠️ Session idle timeout exceeded, restarting to save credits");
          initializeAvatar(sessionId, avatarId).catch(handleAvatarFailure);
        }
      }, 60000); // Check every minute
      
      console.log("✅ Avatar initialization complete with LiveKit transport");
      console.log("💰 Credit optimization active - Max session: 5min, Idle timeout: 2min");
      
      // Clear the timeout since initialization succeeded
      clearTimeout(initTimeout);
      
    } catch (error) {
      console.error("Avatar initialization failed:", error);
      
      // Clear the timeout on error
      clearTimeout(initTimeout);
      
      handleAvatarFailure(error);
      
        // Retry logic with longer timeout for concurrent limit errors
        const isConurrentLimit = error && typeof error === 'object' && 'responseText' in error && 
                                typeof error.responseText === 'string' && error.responseText.includes('Concurrent limit reached');
        const retryDelay = isConurrentLimit ? 120000 : avatarTimeout; // 2 minutes for concurrent limit, normal timeout otherwise
        
        console.log(`Will retry initialization in ${retryDelay/1000} seconds...`);
        setTimeout(() => {
          console.log("Retrying avatar initialization...");
          initializationInProgressRef.current = false;
          initializeAvatar(sessionId, avatarId).catch(handleAvatarFailure);
        }, retryDelay);
        return;
    } finally {
      initializationInProgressRef.current = false;
    }
  }, [avatarRef, avatarTimeout, endSession, handleAvatarFailure, setupAvatarEventListeners, forceCleanupAllSessions, voiceEnabled]);

  // Consolidated initialization effect with debouncing and credit optimization
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    const shouldReinitialize = enabled && (
      sessionId !== currentSessionIdRef.current ||
      currentAvatarIdRef.current !== avatarId
    );
    
    if (sessionId !== currentSessionIdRef.current) {
      console.log("🔄 Session ID changed:", {
        previous: currentSessionIdRef.current,
        new: sessionId,
        sessionActive: sessionActive,
        willReinitialize: shouldReinitialize
      });
      
      // If we have an active session and the new session ID is just a timestamp variation,
      // don't reinitialize unnecessarily
      if (sessionActive && currentSessionIdRef.current && sessionId) {
        const baseSessionId = currentSessionIdRef.current.split('_')[0];
        const newBaseSessionId = sessionId.split('_')[0];
        if (baseSessionId === newBaseSessionId) {
          console.log("🔒 Keeping existing session - session ID change appears to be timestamp variation");
          return () => {
            if (timeoutId) clearTimeout(timeoutId);
          };
        }
      }
    }
    
    if (currentAvatarIdRef.current !== avatarId) {
      console.log("🔄 Avatar ID changed:", {
        previous: currentAvatarIdRef.current,
        new: avatarId,
        sessionActive: sessionActive,
        willReinitialize: shouldReinitialize
      });
      // Set transitioning state for smooth UI
      setIsTransitioning(true);
    }
    
    if (shouldReinitialize) {
      // Debounce initialization to prevent rapid session creation/destruction
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        if (sessionId && avatarId) {
          // Clear errors and set transitioning state
          setError('');
          setErrorType('');
          setIsTransitioning(true);
          
          try {
            await initializeAvatar(sessionId, avatarId);
            setIsTransitioning(false);
          } catch (error) {
            handleAvatarFailure(error);
            setIsTransitioning(false);
          }
        }
      }, DEBOUNCE_DELAY_MS);
    } else if (!enabled) {
      // End session when component is disabled
      endSession().catch(error => console.error("Error ending session:", error));
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [avatarId, enabled, endSession, handleAvatarFailure, initializeAvatar, sessionId]);

  // Assign stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log("🎥 Assigning MediaStream to video element");
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        console.log("📺 Video metadata loaded, starting playback");
        videoRef.current?.play().catch(err => {
          console.warn("Video autoplay failed (expected in some browsers):", err);
        });
      };
    } else if (videoRef.current && !stream) {
      console.log("🔌 Clearing video stream");
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up resources");
      if (sessionMonitorIntervalRef.current) {
        clearInterval(sessionMonitorIntervalRef.current);
      }
      // Direct cleanup without calling endSession to avoid dependency issues
      if (localAvatarRef.current) {
        (localAvatarRef.current as any).stopAvatar?.().catch(() => {});
        localAvatarRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" onMouseMove={updateActivity} onTouchMove={updateActivity}>
      {enabled ? (
        <>
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ opacity: stream ? 1 : 0, transition: 'opacity 0.5s ease' }}
            />
            {(!stream || isTransitioning) && !avatarFailed && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                  <p>{isTransitioning ? 'Switching Avatar...' : 'Loading Avatar...'}</p>
                  <p className="text-sm text-gray-400 mt-2">Using LiveKit transport</p>
                </div>
              </div>
            )}
            {avatarFailed && fallbackAvatarUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <img 
                  src={fallbackAvatarUrl} 
                  alt="Fallback Avatar" 
                  className="w-full h-full object-cover" 
                />
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
