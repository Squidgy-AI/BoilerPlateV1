'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface SpeechToTextProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  disabled?: boolean;
  className?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechToText: React.FC<SpeechToTextProps> = ({
  onTranscript,
  onError,
  language = 'en-US',
  continuous = false,
  interimResults = true,
  disabled = false,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        setInterimText('');
        finalTranscriptRef.current = '';
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update interim text for real-time display
        setInterimText(interimTranscript);

        // If we have final results, send them
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          console.log('🗣️ Final transcript:', finalTranscript);
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('🚨 Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
        
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone access denied or not available.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage = 'Network error occurred during speech recognition.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was aborted.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        if (onError) {
          onError(errorMessage);
        }
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
        setInterimText('');
        
        // If we have accumulated final transcript, send it
        if (finalTranscriptRef.current.trim()) {
          console.log('🗣️ Complete transcript:', finalTranscriptRef.current);
          onTranscript(finalTranscriptRef.current.trim());
          finalTranscriptRef.current = '';
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, onTranscript, onError]);

  const startListening = () => {
    if (!isSupported) {
      const errorMsg = 'Speech recognition is not supported in this browser';
      console.error('🚨', errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('🚨 Error starting speech recognition:', error);
      if (onError) onError('Failed to start speech recognition');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center text-gray-500 ${className}`}>
        <MicOff size={16} />
        <span className="ml-1 text-xs">Speech not supported</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`
          p-2 rounded-lg transition-all duration-200 flex items-center justify-center
          ${isListening 
            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <Volume2 size={16} /> : <Mic size={16} />}
      </button>
      
      {/* Interim text display */}
      {interimText && (
        <div className="ml-2 text-sm text-gray-400 italic">
          "{interimText}"
        </div>
      )}
    </div>
  );
};

export default SpeechToText;
