declare module '@heygen/streaming-avatar' {
    export enum AvatarQuality {
      Low = 'low',
      Medium = 'medium',
      High = 'high'
    }
    
    export enum StreamingEvents {
      STREAM_READY = 'stream-ready',
      AVATAR_START_TALKING = 'avatar-start-talking',
      AVATAR_STOP_TALKING = 'avatar-stop-talking',
      STREAM_DISCONNECTED = 'stream-disconnected'
    }
    
    export enum TaskMode {
      SYNC = 'sync',
      ASYNC = 'async'
    }
    
    export enum TaskType {
      REPEAT = 'repeat'
    }
    
    export enum VoiceEmotion {
      NEUTRAL = 'neutral'
    }
    
    export interface StreamingAvatarOptions {
      token: string;
    }
    
    export interface SpeakOptions {
      text: string;
      taskType: TaskType;
      taskMode: TaskMode;
    }
    
    export interface StartAvatarOptions {
      quality: AvatarQuality;
      avatarName: string;
      voice: {
        rate: number;
        emotion: VoiceEmotion;
      };
      language: string;
      disableIdleTimeout: boolean;
    }
  
    export interface StartVoiceChatOptions {
      useSilencePrompt: boolean;
    }
    
    export default class StreamingAvatar {
      constructor(options: StreamingAvatarOptions);
      on(event: StreamingEvents, callback: (event: any) => void): void;
      createStartAvatar(options: StartAvatarOptions): Promise<any>;
      startVoiceChat(options: StartVoiceChatOptions): Promise<any>;
      speak(options: SpeakOptions): Promise<any>;
      stopAvatar(): Promise<void>;
    }
  }