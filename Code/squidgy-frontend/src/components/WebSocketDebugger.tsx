// src/components/WebSocketDebugger.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Code2, ChevronDown, ChevronUp } from 'lucide-react';

interface DebugMessage {
  timestamp: Date;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  data?: any;
}

interface WebSocketDebuggerProps {
  websocket: WebSocket | null;
  status: 'connected' | 'connecting' | 'disconnected';
  logs?: DebugMessage[];
  className?: string;
}

const WebSocketDebugger: React.FC<WebSocketDebuggerProps> = ({ 
  websocket,
  status,
  logs = [],
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Merge logs prop and internal messages, deduplicate by timestamp+message, and sort chronologically
  const mergedMessages = useMemo(() => {
    const all = [...messages, ...logs];
    const seen = new Set();
    const deduped = all.filter(msg => {
      const key = msg.timestamp.toString() + msg.message;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, logs]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mergedMessages, isExpanded]);
  
  // Add initial connection status message
  useEffect(() => {
    const statusMessage: DebugMessage = {
      timestamp: new Date(),
      type: status === 'connected' ? 'success' : status === 'connecting' ? 'warning' : 'error',
      message: `WebSocket ${status}`
    };
    
    setMessages(prev => [...prev, statusMessage].slice(-100)); // Keep last 100 messages
  }, [status]);
  
  // Listen for WebSocket events
  useEffect(() => {
    if (!websocket) return;
    
    const handleOpen = () => {
      const msg: DebugMessage = {
        timestamp: new Date(),
        type: 'success',
        message: 'WebSocket connection established'
      };
      setMessages(prev => [...prev, msg].slice(-100));
    };
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const msg: DebugMessage = {
          timestamp: new Date(),
          type: 'info',
          message: `Message received: ${data.type || 'unknown'}`,
          data
        };
        setMessages(prev => [...prev, msg].slice(-100));
      } catch (error) {
        const msg: DebugMessage = {
          timestamp: new Date(),
          type: 'error',
          message: 'Error parsing message',
          data: event.data
        };
        setMessages(prev => [...prev, msg].slice(-100));
      }
    };
    
    const handleClose = (event: CloseEvent) => {
      const msg: DebugMessage = {
        timestamp: new Date(),
        type: 'error',
        message: `WebSocket closed: ${event.code} ${event.reason || 'No reason'}`
      };
      setMessages(prev => [...prev, msg].slice(-100));
    };
    
    const handleError = () => {
      const msg: DebugMessage = {
        timestamp: new Date(),
        type: 'error',
        message: 'WebSocket error occurred'
      };
      setMessages(prev => [...prev, msg].slice(-100));
    };
    
    websocket.addEventListener('open', handleOpen);
    websocket.addEventListener('message', handleMessage);
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('error', handleError);
    
    return () => {
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('message', handleMessage);
      websocket.removeEventListener('close', handleClose);
      websocket.removeEventListener('error', handleError);
    };
  }, [websocket]);
  
  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Get message color based on type
  const getMessageColor = (type: DebugMessage['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
      default:
        return 'text-green-400';
    }
  };
  
  return (
    <div className={`bg-black border-t border-gray-700 transition-all duration-300 ${
      isExpanded ? 'h-40' : 'h-10'
    } ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-green-400" />
          <span className="text-sm text-white">WebSocket Debug Console</span>
          <span className={`text-xs px-2 py-1 rounded ${
            status === 'connected' ? 'bg-green-900 text-green-400' : 
            status === 'connecting' ? 'bg-yellow-900 text-yellow-400' :
            'bg-red-900 text-red-400'
          }`}>
            {status}
          </span>
        </div>
        <button className="text-gray-400 hover:text-white">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      
      {/* Messages */}
      {isExpanded && (
        <div className="h-[120px] overflow-y-auto p-3 font-mono text-xs custom-scrollbar">
          {messages.length === 0 ? (
            <div className="text-gray-500">No messages yet...</div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">[{formatTime(msg.timestamp)}]</span>
                <span className={`ml-2 ${getMessageColor(msg.type)}`}>
                  {msg.message}
                </span>
                {msg.data && (
                  <div className="ml-4 text-gray-400 text-[10px] mt-0.5 whitespace-pre-wrap">
                    {/* Show error code and reason if present, else fallback to JSON */}
                    {'code' in msg.data || 'reason' in msg.data || 'wasClean' in msg.data ? (
                      <>
                        {msg.data.code !== undefined && <div><b>Code:</b> {msg.data.code}</div>}
                        {msg.data.reason && <div><b>Reason:</b> {msg.data.reason}</div>}
                        {msg.data.wasClean !== undefined && <div><b>Was clean:</b> {msg.data.wasClean ? 'Yes' : 'No'}</div>}
                        {msg.data.type && <div><b>Event type:</b> {msg.data.type}</div>}
                      </>
                    ) : (typeof msg.data === 'object' ? JSON.stringify(msg.data, null, 2) : String(msg.data))}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

export default WebSocketDebugger;