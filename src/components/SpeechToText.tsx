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

        // If we have final transcript, add it to our accumulator
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          console.log('🎯 Final transcript chunk:', finalTranscript);
        }
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
        setInterimText('');
        
        // Send the final accumulated transcript if we have any
        if (finalTranscriptRef.current.trim()) {
          console.log('📤 Sending final transcript:', finalTranscriptRef.current.trim());
          onTranscript(finalTranscriptRef.current.trim());
        }
        
        finalTranscriptRef.current = '';
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('🚨 Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
        
        if (onError) {
          onError(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language, continuous, interimResults, onTranscript, onError]);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !disabled) {
      try {
        console.log('🎤 Starting speech recognition...');
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        if (onError) {
          onError('Failed to start speech recognition');
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        console.log('🛑 Stopping speech recognition...');
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
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
      <div className={`flex items-center justify-center p-2 text-gray-500 ${className}`}>
        <MicOff size={16} />
        <span className="ml-2 text-sm">Speech recognition not supported</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`
          flex items-center justify-center p-2 rounded-full transition-all duration-200
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        `}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <Volume2 size={16} /> : <Mic size={16} />}
      </button>
      
      {interimText && (
        <div className="text-sm text-gray-500 italic">
          {interimText}
        </div>
      )}
      
      {isListening && (
        <div className="text-xs text-blue-500 animate-pulse">
          Listening...
        </div>
      )}
    </div>
  );
};

export default SpeechToText;