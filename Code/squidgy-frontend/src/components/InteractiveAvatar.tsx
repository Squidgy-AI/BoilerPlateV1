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
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ onAvatarReady, avatarRef }) => {
  const [stream, setStream] = useState<MediaStream>();
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [avatarId] = useState<string>('Anna_public_3_20240108');
  const mediaStream = useRef<HTMLVideoElement>(null);
  const localAvatarRef = useRef<StreamingAvatar | null>(null);
  const [debug, setDebug] = useState<string>("");

  const actualAvatarRef = avatarRef || localAvatarRef;

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  }

  async function startAvatarSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    actualAvatarRef.current = new StreamingAvatar({
      token: newToken,
    });

    setupAvatarEventListeners();

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
      endSession();
    });
  }

  async function endSession() {
    await actualAvatarRef.current?.stopAvatar();
    setStream(undefined);
  }

  useEffect(() => {
    startAvatarSession();
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [stream, mediaStream]);

  return (
    <div className="w-full h-full bg-[#2D3B4F] rounded-lg overflow-hidden">
      {stream ? (
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
      )}
    </div>
  );
};

export default InteractiveAvatar;