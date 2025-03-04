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
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ 
  onAvatarReady, 
  avatarRef, 
  enabled = true
}) => {
  const [stream, setStream] = useState<MediaStream>();
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [avatarId] = useState<string>('Anna_public_3_20240108');
  const mediaStream = useRef<HTMLVideoElement>(null);
  const localAvatarRef = useRef<StreamingAvatar | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const tokenRef = useRef<string>("");

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
    
    // Only fetch a new token if we don't have one
    if (!tokenRef.current) {
      await fetchAccessToken();
    }

    // Create a new StreamingAvatar instance only if needed
    if (!actualAvatarRef.current) {
      actualAvatarRef.current = new StreamingAvatar({
        token: tokenRef.current,
      });
      setupAvatarEventListeners();
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

      if (onAvatarReady) {
        onAvatarReady();
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
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
      await actualAvatarRef.current.stopAvatar();
      setSessionActive(false);
      setStream(undefined);
      // Don't destroy the instance, just stop the avatar
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
          <div className="w-full h-full flex items-center justify-center text-white">
            {isLoadingSession ? "Loading avatar..." : "Avatar will appear here"}
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