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

// Define missing types for compatibility
const VoiceChatTransport = {
  WEBSOCKET: "websocket",
  WEBRTC: "webrtc"
} as const;

// Type definition for event handler function to avoid TypeScript errors
type EventHandler = (avatar: any, eventName: string, callback: (event?: any) => void) => void;

// Create a safe event handler function that works with any event name
const safeAddEventListener: EventHandler = (avatar, eventName, callback) => {
  // @ts-ignore - Using string event names for compatibility
  avatar.on(eventName, callback);
};

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
  
  // Constants for credit optimization
  const SESSION_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  const IDLE_TIMEOUT_MS = 30 * 1000; // 30 seconds
  const DEBOUNCE_DELAY_MS = 500; // 500ms

  // Handle avatar failures consistently
  const handleAvatarFailure = useCallback((error: any) => {
    console.error('Avatar failure:', error);
    setAvatarFailed(true);
    setError(error?.message || 'Avatar initialization failed');
    setErrorType('avatar_failure');
    
    // Load fallback avatar image
    setFallbackAvatarUrl(getFallbackAvatar(avatarId || 'presaleskb'));
    
    if (onAvatarError) {
      onAvatarError(error?.message || 'Avatar initialization failed');
    }
  }, [avatarId, onAvatarError]);

  // End session and clean up resources to save credits
  const endSession = useCallback(async () => {
    console.log('Ending session to save credits');
    
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
        console.log('Voice chat stopped');
        voiceChatActiveRef.current = false;
      } catch (err) {
        console.error('Error stopping voice chat:', err);
      }
    }
    
    // Clean up avatar instance
    if (localAvatarRef.current) {
      try {
        // Cast to any to access destroy method
        await (localAvatarRef.current as any).destroy?.();
        console.log('Avatar instance destroyed');
      } catch (err) {
        console.error('Error destroying avatar:', err);
      }
      localAvatarRef.current = null;
    }
    
    // Reset state
    setSessionActive(false);
    setStream(undefined);
    sessionStartTimeRef.current = null;
    console.log('Session cleanup complete');
  }, []);

  // Setup avatar event listeners
  const setupAvatarEventListeners = useCallback((avatar: StreamingAvatar) => {
    console.log("Setting up comprehensive event listeners...");
    
    // Use safeAddEventListener to avoid TypeScript errors
    safeAddEventListener(avatar, 'stream_ready', (event: any) => {
      console.log("Stream ready event received:", event.detail);
      setStream(event.detail);
      console.log("Stream state updated, avatar should now be visible");
    });
    
    safeAddEventListener(avatar, 'avatar_start_talking', () => {
      console.log("Avatar started talking");
    });
    
    safeAddEventListener(avatar, 'avatar_stop_talking', () => {
      console.log("Avatar stopped talking");
    });
    
    safeAddEventListener(avatar, 'voice_chat_started', () => {
      console.log("Voice chat started");
      voiceChatActiveRef.current = true;
    });
    
    safeAddEventListener(avatar, 'voice_chat_stopped', () => {
      console.log("Voice chat stopped");
      voiceChatActiveRef.current = false;
    });
    
    safeAddEventListener(avatar, 'stream_disconnected', () => {
      console.log("Stream disconnected");
      setStream(undefined);
    });
    
    safeAddEventListener(avatar, 'error', (event: any) => {
      console.error("Avatar error:", event);
      handleAvatarFailure(event);
    });
  }, [handleAvatarFailure]);

  // Initialize avatar with credit-saving optimizations
  const initializeAvatar = useCallback(async (sessionId: string, avatarId: string) => {
    // Prevent multiple initializations
    if (initializationInProgressRef.current) {
      console.log("Avatar initialization already in progress, skipping...");
      return;
    }
    
    // Update initialization state
    initializationInProgressRef.current = true;
    lastInitAttemptTimeRef.current = Date.now();
    
    try {
      console.log("Initializing avatar with session ID:", sessionId, "and avatar ID:", avatarId);
      
      // Clean up any existing session first
      await endSession();
      
      // Get token from API
      const response = await fetch('/api/get-access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }
      
      const { token } = await response.json();
      if (!token) {
        throw new Error('No token received from API');
      }
      
      console.log("Received access token");
      
      // Create new avatar instance
      const avatar = new StreamingAvatar({
        token,
        // @ts-ignore - transport is required but not in type definition
        transport: VoiceChatTransport.WEBSOCKET,
        element: videoRef.current as HTMLVideoElement,
      });
      
      // Set up event listeners
      setupAvatarEventListeners(avatar);
      
      // Store avatar instance in refs
      localAvatarRef.current = avatar;
      if (avatarRef) {
        avatarRef.current = avatar;
      }
      
      // Start avatar with credit-saving optimizations
      // @ts-ignore - start method exists but is not in type definition
      await avatar.start({
        avatarName: getValidatedAvatarId(avatarId),
        quality: AvatarQuality.Low,
        voice: {
          rate: 1.0,
          emotion: VoiceEmotion.NEUTRAL
        },
        language: 'en', // Required by StartAvatarOptions
        idleTimeoutMs: IDLE_TIMEOUT_MS, // Auto-close after 30s of inactivity
        disableIdleTimeout: false // Enable idle timeout
      });
      
      // Update state and refs
      setSessionActive(true);
      setAvatarFailed(false);
      currentSessionIdRef.current = sessionId;
      currentAvatarIdRef.current = avatarId;
      sessionStartTimeRef.current = Date.now();
      
      // Set up session monitoring to prevent long-running sessions
      if (sessionMonitorIntervalRef.current) {
        clearInterval(sessionMonitorIntervalRef.current);
      }
      
      sessionMonitorIntervalRef.current = setInterval(() => {
        if (sessionStartTimeRef.current && Date.now() - sessionStartTimeRef.current > SESSION_MAX_DURATION_MS) {
          console.log("Session exceeding max duration, restarting to save credits");
          initializeAvatar(sessionId, avatarId).catch(handleAvatarFailure);
        }
      }, 60000); // Check every minute
      
      // Notify parent component
      if (onAvatarReady) {
        onAvatarReady();
      }
      
      console.log("Avatar initialization complete");
    } catch (error) {
      console.error("Avatar initialization failed:", error);
      handleAvatarFailure(error);
      
      // Retry logic with timeout
      console.log(`Will retry initialization in ${avatarTimeout/1000} seconds...`);
      setTimeout(() => {
        console.log("Retrying avatar initialization...");
        initializationInProgressRef.current = false;
        initializeAvatar(sessionId, avatarId).catch(handleAvatarFailure);
      }, avatarTimeout);
    } finally {
      initializationInProgressRef.current = false;
    }
  }, [avatarRef, avatarTimeout, endSession, handleAvatarFailure, onAvatarReady, setupAvatarEventListeners]);

  // Consolidated initialization effect with debouncing and credit optimization
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    const shouldReinitialize = enabled && (
      sessionId !== currentSessionIdRef.current ||
      currentAvatarIdRef.current !== avatarId
    );
    
    if (shouldReinitialize) {
      // Debounce initialization to prevent rapid session creation/destruction
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (sessionId && avatarId) {
          initializeAvatar(sessionId, avatarId).catch(handleAvatarFailure);
        }
      }, DEBOUNCE_DELAY_MS);
    } else if (!enabled && sessionActive) {
      // End session when component is disabled
      endSession().catch(error => console.error("Error ending session:", error));
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [avatarId, enabled, endSession, handleAvatarFailure, initializeAvatar, sessionActive, sessionId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up resources");
      if (sessionMonitorIntervalRef.current) {
        clearInterval(sessionMonitorIntervalRef.current);
      }
      endSession().catch(error => console.error("Error during cleanup:", error));
    };
  }, [endSession]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
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
            {!stream && !avatarFailed && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Loading Avatar...</p>
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
