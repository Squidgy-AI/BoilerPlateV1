'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import { trackActivity, ActivityType } from '@/utils/activityTracker';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import { getHeygenAvatarId, getFallbackAvatar, getValidatedAvatarId } from '@/config/agents';
// HeyGen service functions removed - avatar speech now uses SDK speak method directly

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
const IDLE_TIMEOUT_MS = 30 * 1000; // 30 seconds - CRITICAL: Prevent credit waste
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
  retryTrigger?: number; // Increment this to trigger a manual retry
  cleanupTrigger?: number; // Increment this to trigger immediate cleanup
  onTextToSpeech?: (text: string) => Promise<boolean>; // Callback for external text-to-speech requests
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({
  onAvatarReady,
  avatarRef,
  enabled = true,
  sessionId,
  voiceEnabled = true,
  avatarId = 'PersonalAssistant',
  onAvatarError,
  avatarTimeout = 180000, // 180 seconds default timeout (3 minutes)
  retryTrigger = 0,
  cleanupTrigger = 0,
  onTextToSpeech
}) => {
  // State management
  const [stream, setStream] = useState<MediaStream>();
  const [error, setError] = useState<string>("");
  const [errorType, setErrorType] = useState<string>("");
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);
  const [fallbackAvatarUrl, setFallbackAvatarUrl] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [deactivatedForInactivity, setDeactivatedForInactivity] = useState<boolean>(false);

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
  const lastActivityTimeRef = useRef<number>(0); // Track last user activity - initialized in useEffect
  const lastRetryTriggerRef = useRef<number>(0); // Track last processed retry trigger
  const initializationSuccessRef = useRef<boolean>(false); // Track if initialization has succeeded

  // Constants for credit optimization
  const SESSION_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  const IDLE_TIMEOUT_MS = 30 * 1000; // 30 seconds - CRITICAL: Prevent credit waste
  const DEBOUNCE_DELAY_MS = 500; // 500ms

  // Initialize activity timestamp after component mounts to prevent hydration mismatch
  useEffect(() => {
    lastActivityTimeRef.current = Date.now();
  }, []);

  // Handle avatar failures consistently
  const handleAvatarFailure = useCallback((error: any) => {
    console.log("Avatar failure:", error);
    
    // Clear initialization progress flag
    initializationInProgressRef.current = false;
    
    // Set avatar failed state
    setAvatarFailed(true);
    setSessionActive(false);
    
    // Determine error type and message
    let errorMessage = 'Avatar initialization failed';
    let errorType = 'general';
    
    // Check if it's a concurrent limit error
    if (error?.responseText && error.responseText.includes('Concurrent limit reached')) {
      console.warn('🚫 HeyGen concurrent limit reached - this is an API limitation, not a code issue');
      console.log('💡 Solution: Wait a few minutes for existing sessions to expire, or upgrade HeyGen plan');
      errorMessage = 'HeyGen concurrent limit reached. Please wait a few minutes or upgrade your plan.';
      errorType = 'concurrent_limit';
    } 
    // Check if it's a credit exhaustion error (400 status or specific message)
    else if (error?.message && error.message.includes('credits exhausted')) {
      console.error('💳 HeyGen credits exhausted');
      errorMessage = error.message;
      errorType = 'credit_exhaustion';
    }
    // Check for other 400 errors that might indicate credit issues
    else if (error?.message && (error.message.includes('400') || error.message.includes('Bad Request'))) {
      console.error('💳 Possible HeyGen credit or API issue - 400 status');
      errorMessage = 'HeyGen API error (400). This may indicate insufficient credits or account issues.';
      errorType = 'api_400_error';
    }
    else {
      errorMessage = error?.message || 'Avatar initialization failed';
    }
    
    setError(errorMessage);
    setErrorType(errorType);
    setAvatarFailed(true);
    
    // Load fallback avatar image
    setFallbackAvatarUrl(getFallbackAvatar(avatarId || 'presaleskb'));
    
    // Notify parent component
    if (onAvatarError) {
      onAvatarError(errorMessage);
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
      } catch (err: any) {
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
      } catch (err: any) {
        // Don't log 401 errors as they're expected when session wasn't properly created
        if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string' && !(err as any).message.includes('401')) {
          console.error('Error stopping avatar:', err);
        }
      }
    }
    
    // Track avatar session end
    try {
      console.log('%c🎭 Tracking avatar session end', 'background: #2d3748; color: #f56565; padding: 2px; border-radius: 2px;');
      trackActivity({
        action: ActivityType.AVATAR_DISABLED,
        details: { 
          description: 'Avatar session ended',
          avatarId: currentAvatarIdRef.current || 'unknown',
          sessionId: currentSessionIdRef.current?.substring(0, 8) || 'unknown',
          reason: 'session_cleanup',
          timestamp: new Date().toISOString()
        }
      }).catch((err: Error) => console.error('Failed to track avatar session end:', err));
    } catch (trackError) {
      console.error('Error tracking avatar session end:', trackError);
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
      } catch (err: any) {
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
    console.log("🔍 Setting up critical stream_ready event listener");
    safeAddEventListener(avatar, 'stream_ready', (event: any) => {
      console.log("🎬 Stream ready event received:", event);
      
      // Extract stream from CustomEvent or direct event
      // For CustomEvent, the stream is in event.detail
      // For direct events, it might be in event.stream
      const stream = event?.detail instanceof MediaStream ? event.detail : 
                    event?.stream instanceof MediaStream ? event.stream : null;
      
      console.log("🔍 Stream extraction attempt:", {
        hasEvent: !!event,
        isCustomEvent: event instanceof CustomEvent,
        hasDetail: !!event?.detail,
        detailIsStream: event?.detail instanceof MediaStream,
        hasStreamProperty: !!event?.stream,
        streamPropertyIsStream: event?.stream instanceof MediaStream,
        extractedStream: !!stream
      });
      
      // Validate the MediaStream
      if (stream instanceof MediaStream) {
        console.log("✅ Valid MediaStream received with " + stream.getTracks().length + " tracks");
        
        // Log track details for debugging
        stream.getTracks().forEach((track: MediaStreamTrack, index: number) => {
          console.log(`Track ${index}: ${track.kind} - ${track.id} (enabled: ${track.enabled})`);
          // Ensure video tracks are enabled
          if (track.kind === 'video' && !track.enabled) {
            console.log(`🔄 Enabling disabled video track: ${track.id}`);
            track.enabled = true;
          }
        });
        
        console.log("📺 Stream state updated, video should now be visible");
        
        // Store the extracted stream for use in the component
        console.log("🔄 Setting stream state with MediaStream:", stream);
        setStream(stream);
        console.log("✅ Avatar stream ready - initialization complete");
        
        // Force a re-render check after state update
        setTimeout(() => {
          console.log("🔍 Post-setState stream check - current stream state should be set");
        }, 100);
      }
      
      // Mark initialization as successful - CRITICAL FLAG
      initializationSuccessRef.current = true;
      initializationInProgressRef.current = false;
      
      // Track successful avatar initialization
      if (stream instanceof MediaStream) {
        try {
          console.log('%c🎭 Tracking avatar initialization success', 'background: #2d3748; color: #4ade80; padding: 2px; border-radius: 2px;');
          trackActivity({
            action: ActivityType.AVATAR_INITIALIZED,
            details: { 
              description: 'Avatar initialized successfully',
              avatarId: currentAvatarIdRef.current || 'unknown',
              sessionId: currentSessionIdRef.current?.substring(0, 8) || 'unknown',
              timestamp: new Date().toISOString()
            }
          }).catch((err: Error) => console.error('Failed to track avatar initialization:', err));
        } catch (trackError) {
          console.error('Error tracking avatar initialization:', trackError);
        }
        
        // Notify parent component that avatar is ready
        if (onAvatarReady) {
          console.log("🎯 Calling onAvatarReady callback - video stream is now visible");
          onAvatarReady();
        }
      } else {
        // This is likely a secondary notification or status update event
        // Log as info instead of warning since we've handled the main stream event
        console.log("💬 Secondary stream_ready event received without stream data - this is normal");
      }
      
      // Reset error state if it was previously set
      setError("");
      setErrorType("");
      setAvatarFailed(false);
      
      // Update activity timestamp
      updateActivity();
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
    initializationSuccessRef.current = false; // Reset success flag when starting new initialization
    lastInitAttemptTimeRef.current = Date.now();
    
    // Set up a timeout to prevent forever loading
    const initTimeout = setTimeout(() => {
      // Only force failure if initialization is in progress AND success flag is not set
      if (initializationInProgressRef.current && !initializationSuccessRef.current) {
        console.log("⏱️ Avatar initialization timeout - forcing failure");
        console.log("🔍 Timeout debug info:", {
          initializationInProgress: initializationInProgressRef.current,
          initializationSuccess: initializationSuccessRef.current,
          timeElapsed: Date.now() - lastInitAttemptTimeRef.current,
          timeoutValue: avatarTimeout || 180000
        });
        handleAvatarFailure(new Error("Avatar initialization timeout"));
        initializationInProgressRef.current = false;
      } else if (initializationSuccessRef.current) {
        console.log("✅ Initialization already succeeded - ignoring timeout");
      } else {
        console.log("ℹ️ Initialization no longer in progress - ignoring timeout");
      }
    }, avatarTimeout || 180000); // Use prop timeout or 180 seconds as fallback
    
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
        
        // 🚫 Avatar voice chat is temporarily disabled
        // Start voice chat after stabilization
        if (false) {
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
        } else {
          console.log("🚫 Avatar voice chat is disabled - avatar will not listen to voice input");
          voiceChatActiveRef.current = false;
        }
        
      } catch (error) {
        console.error("Avatar initialization failed:", error);
        
        // Enhanced error logging for 400 status errors
        let errorMessage = '';
        let is400Error = false;
        
        if (error && typeof error === 'object') {
          // Check for different error formats
          if ('status' in error && error.status === 400) {
            is400Error = true;
            const message = 'message' in error && typeof error.message === 'string' ? error.message : 'Bad Request';
            errorMessage = `API request failed with status 400: ${message}`;
          } else if ('responseText' in error && typeof error.responseText === 'string') {
            const responseText = error.responseText as string;
            if (responseText.includes('400') || responseText.includes('Bad Request')) {
              is400Error = true;
              errorMessage = `API request failed with status 400: ${responseText}`;
            } else {
              errorMessage = responseText;
            }
          } else if ('message' in error && typeof error.message === 'string') {
            const message = error.message as string;
            errorMessage = message;
            if (message.includes('400') || message.includes('Bad Request')) {
              is400Error = true;
            }
          } else {
            errorMessage = String(error);
          }
        } else {
          errorMessage = String(error);
        }
        
        // Log detailed error information
        console.error("🔍 Detailed error analysis:", {
          originalError: error,
          errorMessage,
          is400Error,
          errorType: typeof error,
          errorKeys: error && typeof error === 'object' ? Object.keys(error) : 'N/A'
        });
        
        // If it's a 400 error, likely credit exhaustion
        if (is400Error) {
          console.error("💳 Likely HeyGen credit exhaustion - 400 status detected");
          handleAvatarFailure(new Error('HeyGen credits exhausted. Please check your account balance and try again later.'));
        } else {
          handleAvatarFailure(error);
        }
        
        // If it's a concurrent limit error, trigger force cleanup
        if (error && typeof error === 'object' && 'responseText' in error && 
            typeof error.responseText === 'string' && error.responseText.includes('Concurrent limit reached')) {
          console.log('🚨 Concurrent limit detected - triggering force cleanup');
          await forceCleanupAllSessions();
        }
        
        // No automatic retry - user must manually retry via button
        console.log("⚠️ Avatar initialization failed - no automatic retry, user must click retry button");
        initializationInProgressRef.current = false;
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
          console.log("🚨 CRITICAL: Session exceeding max duration (5 minutes), ending session to prevent credit waste");
          console.log("💰 Credit protection activated - session terminated due to duration limit");
          endSession();
        } else if (idleDuration > IDLE_TIMEOUT_MS) {
          console.log("🚨 CRITICAL: Session idle timeout exceeded (30 seconds), ending session to prevent credit waste");
          console.log("💰 Credit protection activated - session terminated due to inactivity");
          setDeactivatedForInactivity(true);
          endSession();
        }
      }, 15000); // Check every 15 seconds for 30-second timeout
      
      console.log("✅ Avatar initialization complete with LiveKit transport");
      console.log("💰 CREDIT PROTECTION ACTIVE - Max session: 5min, Idle timeout: 30sec - Sessions will auto-terminate");
      
      // Note: Avatar initialization tracking is already handled in the stream_ready event handler
      
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
      // don't reinitialize unnecessarily - BUT ONLY if the avatar ID hasn't changed
      if (sessionActive && currentSessionIdRef.current && sessionId && currentAvatarIdRef.current === avatarId) {
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
      
      // Force reset any previous failure state when switching avatars
      if (avatarFailed) {
        console.log("🔄 Resetting failed state due to avatar change");
        setAvatarFailed(false);
        setError('');
        setErrorType('');
      }
      
      // Reset inactivity state when switching avatars
      if (deactivatedForInactivity) {
        console.log("🔄 Resetting inactivity state due to avatar change");
        setDeactivatedForInactivity(false);
      }
    }
    
    // Always initialize when avatar ID changes, regardless of other conditions
    if (currentAvatarIdRef.current !== avatarId && enabled && sessionId && avatarId) {
      console.log("🚀 Forcing initialization due to avatar change");
      
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Add a small delay to ensure previous avatar cleanup completes
      timeoutId = setTimeout(async () => {
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
      }, 800); // Slightly longer delay for agent switches
      
    } else if (shouldReinitialize && !avatarFailed) {
      // Standard initialization for session ID changes
      console.log("🚀 Auto-initializing avatar (no previous failure)");
      
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
    } else if (shouldReinitialize && avatarFailed) {
      console.log("⚠️ Skipping auto-initialization due to previous avatar failure - user must manually retry");
    } else if (!enabled) {
      // End session when component is disabled
      endSession().catch(error => console.error("Error ending session:", error));
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, avatarId, enabled, sessionActive, avatarFailed, deactivatedForInactivity, endSession, initializeAvatar, handleAvatarFailure]);

  // Handle manual retry when retryTrigger changes
  // Manual retry effect - only triggers on explicit user retry button clicks
  useEffect(() => {
    // Only proceed if retry was explicitly triggered and we haven't processed this retry yet
    if (retryTrigger > 0 && 
        !initializationInProgressRef.current && 
        retryTrigger > lastRetryTriggerRef.current) {
      
      console.log(`🔄 Manual retry triggered (#${retryTrigger}) - ${avatarFailed ? 'resetting failed state' : 'forcing restart'}`);
      
      // Track this retry attempt to prevent duplicates
      lastRetryTriggerRef.current = retryTrigger;
      
      // Reset failed state and errors
      setAvatarFailed(false);
      setError('');
      setErrorType('');
      setFallbackAvatarUrl('');
      setDeactivatedForInactivity(false); // Reset inactivity deactivation state
      
      // Trigger reinitialization if we have session and avatar ID
      if (sessionId && avatarId && enabled) {
        console.log("🚀 Starting manual retry initialization");
        setIsTransitioning(true);
        
        // Use a longer delay to prevent rapid retries
        setTimeout(async () => {
          try {
            console.log("🔄 Executing retry attempt...");
            // Let initializeAvatar manage its own initialization flag
            await initializeAvatar(sessionId, avatarId);
            setIsTransitioning(false);
            console.log("✅ Retry attempt completed successfully");
          } catch (error) {
            console.log("❌ Retry attempt failed:", error);
            handleAvatarFailure(error);
            setIsTransitioning(false);
          }
        }, 1500); // Increased delay to prevent rapid retries
      }
    }
  }, [retryTrigger, avatarFailed, sessionId, avatarId, enabled]); // Note: initializeAvatar and handleAvatarFailure not included to prevent infinite loops

  // Handle immediate cleanup when cleanupTrigger changes (e.g., on logout)
  useEffect(() => {
    // Only run cleanup if cleanupTrigger is actually greater than 0
    if (cleanupTrigger > 0) {
      console.log(`🧹 Cleanup trigger activated (#${cleanupTrigger}) - performing immediate cleanup`);
      
      // Prevent any ongoing initialization attempts
      initializationInProgressRef.current = false;
      
      // Reset retry trigger tracking to prevent stale retry attempts
      lastRetryTriggerRef.current = 0;
      console.log("🔍 Current state before cleanup:", {
        avatarExists: !!avatarRef?.current,
        streamExists: !!stream,
        avatarFailed,
        error
      });
      
      // Stop avatar session immediately
      if (avatarRef?.current) {
        console.log("🛑 Stopping avatar session...");
        (avatarRef.current as any).stopAvatar?.().catch((error: any) => {
          console.error("Error stopping avatar:", error);
        });
        avatarRef.current = null;
        console.log("✅ Avatar reference cleared");
      } else {
        console.log("ℹ️ No avatar to stop");
      }
      
      // Clear stream and video
      console.log("📺 Clearing video stream...");
      setStream(undefined);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
        console.log("✅ Video element cleared and paused");
      }
      
      // Reset all state
      console.log("🔄 Resetting component state...");
      setAvatarFailed(false);
      setError('');
      setErrorType('');
      setFallbackAvatarUrl('');
      setIsTransitioning(false);
      setSessionActive(false);
      
      // Clear refs
      currentSessionIdRef.current = '';
      currentAvatarIdRef.current = '';
      initializationInProgressRef.current = false;
      
      console.log("✅ Cleanup trigger completed - all processes should be stopped");
    }
  }, [cleanupTrigger, stream, avatarFailed, error]);

  // Assign stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log("🎥 Assigning MediaStream to video element");
      videoRef.current.srcObject = stream;
      
      // Force video to play when metadata is loaded
      videoRef.current.onloadedmetadata = () => {
        console.log("📺 Video metadata loaded, starting playback");
        
        // Make sure autoplay works even with browser restrictions
        const playPromise = videoRef.current?.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('✅ Video playback started successfully');
          }).catch(err => {
            console.warn("Video autoplay failed (trying muted playback):", err);
            
            // Try with muted as fallback (browsers often allow muted autoplay)
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => {
                console.log('✅ Muted video playback started as fallback');
                // Unmute after a short delay (user gesture may be required)
                setTimeout(() => {
                  if (videoRef.current) videoRef.current.muted = false;
                }, 1000);
              }).catch(innerErr => {
                console.error('Even muted playback failed:', innerErr);
              });
            }
          });
        }
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
      
      // Clear monitoring interval
      if (sessionMonitorIntervalRef.current) {
        clearInterval(sessionMonitorIntervalRef.current);
        sessionMonitorIntervalRef.current = null;
      }
      
      // Clear any active session
      if (localAvatarRef.current) {
        console.log("🧹 Cleaning up avatar session on unmount");
        
        // Stop voice chat if active
        if (voiceChatActiveRef.current) {
          try {
            (localAvatarRef.current as any).stopVoiceChat?.();
            console.log('🔇 Voice chat stopped on unmount');
            voiceChatActiveRef.current = false;
          } catch (err) {
            // Ignore errors on unmount
          }
        }
        
        // Stop avatar
        try {
          (localAvatarRef.current as any).stopAvatar?.();
          console.log('🛑 Avatar session stopped on unmount');
        } catch (err) {
          // Ignore errors on unmount
        }
        
        // Clear reference
        localAvatarRef.current = null;
      }
      
      // Clear video stream
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
        console.log('🔌 Video stream cleared on unmount');
      }
      
      // Reset all state refs for clean remount
      initializationInProgressRef.current = false;
      initializationSuccessRef.current = false;
      sessionStartTimeRef.current = null;
      currentSessionIdRef.current = undefined;
      currentAvatarIdRef.current = undefined;
    };
  }, []); // Empty dependency array for unmount only

  // Streaming Task Methods for HeyGen API
  
  /**
   * Send text to the avatar for speech using HeyGen streaming task API
   * This method uses the REST API endpoint instead of the SDK speak method
   * @param text - The text to be spoken by the avatar
   * @param taskMode - Whether the task is performed synchronously or not (default: sync)
   * @param taskType - Task type: repeat or chat (default: repeat)
   * @returns Promise with task response or null on error
   */
  const sendTextToAvatarAPI = useCallback(async (
    text: string,
    taskMode: 'sync' | 'async' = 'sync',
    taskType: 'repeat' | 'chat' = 'repeat'
  ) => {
    if (!sessionId) {
      console.error('❌ Cannot send text to avatar: No active session ID');
      return null;
    }

    if (!sessionActive) {
      console.error('❌ Cannot send text to avatar: Session not active');
      return null;
    }

    try {
      console.log('🎯 Sending text to avatar via streaming task API:', {
        sessionId: sessionId.substring(0, 8) + '...',
        textLength: text.length,
        taskMode,
        taskType
      });

      // Skip stopping voice chat since it's disabled and never started
      console.log('🔇 Voice chat stop skipped - voice chat is disabled');

      // 🚫 HeyGen service is disabled, use SDK speak method directly
      console.log('🔄 Using SDK speak method (HeyGen service disabled)');
      
      if (localAvatarRef.current) {
        try {
          // @ts-ignore - speak method may not be in type definition
          await localAvatarRef.current.speak({
            text: text,
            taskType: TaskType.REPEAT, // Only REPEAT is available in TaskType enum
            taskMode: taskMode === 'async' ? TaskMode.ASYNC : TaskMode.SYNC
          });
          
          console.log('✅ SDK speak method succeeded');
          updateActivity();
          
          // Restart voice chat after speech
          setTimeout(async () => {
            await restartVoiceChat();
          }, 1000);
          
          // Call the callback if provided
          if (onTextToSpeech) {
            await onTextToSpeech(text);
          }
          
          return { task_id: 'sdk_speak', duration_ms: 0 };
        } catch (speakError) {
          console.error('❌ SDK speak method failed:', speakError);
          // Continue to restart voice chat even if speech fails
        }
      } else {
        console.error('❌ No avatar reference available for speech');
      }
      
      // Ensure voice chat is restarted even if speech fails
      await restartVoiceChat();
      return null;
      
    } catch (error) {
      console.error('❌ Failed to send text to avatar:', error);
      
      // Ensure voice chat is restarted even on error
      await restartVoiceChat();
      return null;
    }
  }, [sessionId, sessionActive, updateActivity, onTextToSpeech]);



  /**
   * Send n8n response text to avatar for speech
   * Convenience method specifically for n8n integration
   * @param n8nResponse - The response text from n8n workflow
   * @param agentType - The type of agent for logging purposes
   * @returns Promise with task response or null on error
   */
  const sendN8nResponseToAvatarAPI = useCallback(async (
    n8nResponse: string,
    agentType?: string
  ) => {
    try {
      console.log('🔄 Processing n8n response for avatar speech:', {
        agentType,
        sessionId: sessionId?.substring(0, 8) + '...',
        responseLength: n8nResponse.length
      });

      // Skip stopping voice chat since it's disabled and never started
      console.log('🔇 Voice chat stop skipped - voice chat is disabled');

      // Use 'chat' task type for n8n responses as they are conversational
      const result = await sendTextToAvatarAPI(n8nResponse, 'sync', 'chat');
      
      if (result) {
        console.log('✅ n8n response sent to avatar successfully');
        
        // Restart voice chat after avatar finishes speaking
        // Add a small delay to ensure avatar speech has started
        setTimeout(async () => {
          await restartVoiceChat();
        }, 1000);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to send n8n response to avatar:', error);
      // Ensure voice chat is restarted even if speech fails
      await restartVoiceChat();
      return null;
    }
  }, [sendTextToAvatarAPI, sessionId]);

  /**
   * Stop voice chat to prevent the avatar from listening
   * Used when the avatar is about to speak to prevent feedback loops
   */
  const stopVoiceChat = useCallback(async () => {
    if (!localAvatarRef.current || !voiceChatActiveRef.current) {
      console.log('🎙️ Voice chat already stopped or avatar not available');
      return;
    }

    try {
      console.log('🔇 Stopping voice chat to prevent feedback during avatar speech');
      
      // Try to stop voice chat using the native SDK method
      // We need to access the original SDK method, not our extended version
      // @ts-ignore - stopVoiceChat method may exist but not in type definition
      const nativeStopVoiceChat = Object.getPrototypeOf(localAvatarRef.current).stopVoiceChat;
      if (typeof nativeStopVoiceChat === 'function') {
        // Call the native SDK method directly to avoid recursion
        await nativeStopVoiceChat.call(localAvatarRef.current);
      } else {
        // Fallback: recreate avatar connection without voice chat
        console.log('⚠️ stopVoiceChat method not available, using fallback approach');
      }
      
      voiceChatActiveRef.current = false;
      console.log('✅ Voice chat stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop voice chat:', error);
    }
  }, []);

  /**
   * Restart voice chat after avatar finishes speaking
   * Used to resume listening after the avatar has delivered its response
   */
  const restartVoiceChat = useCallback(async () => {
    if (!localAvatarRef.current || voiceChatActiveRef.current) {
      console.log('🎙️ Voice chat already active or avatar not available');
      return;
    }

    // 🚫 Voice chat restart disabled - avatar should not listen to user voice
    console.log('🚫 Voice chat restart disabled - avatar will not listen to user voice');
    voiceChatActiveRef.current = false;

    // Note: Avatar will only speak responses, not listen to voice input
    // Voice-to-text is handled separately by SpeechToText component
  }, []);

  // Expose methods via ref if provided
  useEffect(() => {
    if (avatarRef && localAvatarRef.current) {
      // Extend the avatar ref with our custom methods
      const extendedRef = localAvatarRef.current as any;
      extendedRef.sendTextToAvatarAPI = sendTextToAvatarAPI;
      extendedRef.sendN8nResponseToAvatarAPI = sendN8nResponseToAvatarAPI;
      extendedRef.sendTextToAvatar = sendTextToAvatarAPI; // Alias for backward compatibility
      extendedRef.sendN8nResponseToAvatar = sendN8nResponseToAvatarAPI; // Alias for backward compatibility
      extendedRef.stopVoiceChat = stopVoiceChat;
      extendedRef.restartVoiceChat = restartVoiceChat;
      
      avatarRef.current = extendedRef;
    }
  }, [avatarRef, sendTextToAvatarAPI, sendN8nResponseToAvatarAPI]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" onMouseMove={updateActivity} onTouchMove={updateActivity}>
      {enabled ? (
        <>
          <div className="relative w-full h-full bg-gray-800">
            {/* Debug info */}
            <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-50 p-1 rounded z-20">
              Stream: {stream ? 'Connected' : 'None'} | Session: {sessionActive ? 'Active' : 'Inactive'} | Failed: {avatarFailed ? 'Yes' : 'No'}
              <br />Stream Object: {stream ? `${stream.constructor.name} (${stream.getTracks().length} tracks)` : 'null'}
            </div>
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
              style={{ 
                opacity: stream ? 1 : 0.3,
                display: 'block',
                backgroundColor: '#1f2937'
              }}
              onLoadedData={() => console.log('📺 Video loaded data')}
              onCanPlay={() => console.log('📺 Video can play')}
              onPlay={() => console.log('📺 Video started playing')}
              onError={(e) => console.error('📺 Video error:', e)}
              onLoadStart={() => console.log('📺 Video load start')}
              onLoadedMetadata={() => console.log('📺 Video metadata loaded')}
            />
            
            {/* Show inactivity deactivation message */}
            {deactivatedForInactivity && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-800 bg-opacity-90">
                <div className="text-center p-6">
                  <div className="text-6xl mb-4">⏸️</div>
                  <div className="text-xl mb-2">Avatar Deactivated</div>
                  <div className="text-sm text-gray-300 mb-6">Session ended due to inactivity (30 seconds)</div>
                  <button 
                    onClick={() => {
                      console.log('🔄 User clicked reactivate button after inactivity');
                      setDeactivatedForInactivity(false);
                      // Trigger a retry to reactivate the avatar
                      if (sessionId && avatarId && enabled) {
                        initializeAvatar(sessionId, avatarId).catch(error => {
                          console.error('Failed to reactivate avatar:', error);
                          handleAvatarFailure(error);
                        });
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 mx-auto"
                  >
                    Reactivate Avatar
                  </button>
                </div>
              </div>
            )}
            
            {/* Show placeholder when no stream and no error and not deactivated for inactivity */}
            {!stream && !avatarFailed && !deactivatedForInactivity && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-6xl mb-4">📹</div>
                  <div className="text-lg">Initializing Avatar...</div>
                  <div className="text-sm text-gray-400 mt-2">Connecting to HeyGen</div>
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