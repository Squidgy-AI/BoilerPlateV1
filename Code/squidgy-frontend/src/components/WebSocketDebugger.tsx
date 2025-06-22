// src/components/WebSocketDebugger.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Code2, ChevronDown, ChevronUp, RefreshCw, Server, Database, Zap } from 'lucide-react';

interface DebugMessage {
  timestamp: Date;
  type: 'info' | 'error' | 'success' | 'warning' | 'backend' | 'n8n' | 'database';
  message: string;
  data?: any;
  source?: 'websocket' | 'backend' | 'n8n' | 'database' | 'heroku';
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
  const [isLoadingBackendLogs, setIsLoadingBackendLogs] = useState(false);
  const [backendHealth, setBackendHealth] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
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

  // Backend health check
  const checkBackendHealth = async () => {
    setBackendHealth('checking');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackendHealth('healthy');
        
        const healthMsg: DebugMessage = {
          timestamp: new Date(),
          type: 'success',
          source: 'backend',
          message: `Backend health check: ${data.status}`,
          data: {
            active_connections: data.active_connections,
            streaming_sessions: data.streaming_sessions
          }
        };
        setMessages(prev => [...prev, healthMsg].slice(-100));
      } else {
        setBackendHealth('unhealthy');
        const errorMsg: DebugMessage = {
          timestamp: new Date(),
          type: 'error',
          source: 'backend',
          message: `Backend unhealthy: ${response.status} ${response.statusText}`
        };
        setMessages(prev => [...prev, errorMsg].slice(-100));
      }
    } catch (error) {
      setBackendHealth('unhealthy');
      const errorMsg: DebugMessage = {
        timestamp: new Date(),
        type: 'error',
        source: 'backend',
        message: `Backend health check failed: ${error}`
      };
      setMessages(prev => [...prev, errorMsg].slice(-100));
    }
  };

  // Fetch backend logs
  const fetchBackendLogs = async () => {
    setIsLoadingBackendLogs(true);
    
    // Determine which backend to use
    const isProduction = window.location.hostname !== 'localhost';
    const backendUrl = isProduction 
      ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
    
    try {
      const response = await fetch(`${backendUrl}/logs?limit=50`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'success' && data.logs) {
          // Clear existing backend logs
          setMessages(prev => prev.filter(msg => msg.source !== 'backend'));
          
          // Add new logs
          data.logs.forEach((log: any) => {
            const logMsg: DebugMessage = {
              timestamp: new Date(log.timestamp),
              type: log.level === 'ERROR' ? 'error' : 
                    log.level === 'WARNING' ? 'warning' : 
                    log.level === 'INFO' ? 'info' : 'info',
              source: 'backend',
              message: `[${log.module}.${log.function}] ${log.message}`,
              data: {
                module: log.module,
                function: log.function,
                level: log.level
              }
            };
            setMessages(prev => [...prev, logMsg].slice(-100));
          });
          
          const successMsg: DebugMessage = {
            timestamp: new Date(),
            type: 'success',
            source: 'backend',
            message: `Fetched ${data.count} logs from ${isProduction ? 'Heroku' : 'local'} backend`
          };
          setMessages(prev => [...prev, successMsg].slice(-100));
        }
      } else {
        const infoMsg: DebugMessage = {
          timestamp: new Date(),
          type: 'info',
          source: 'heroku',
          message: `Backend: ${backendUrl}. For full Heroku logs: https://dashboard.heroku.com/apps/squidgy-back/logs`
        };
        setMessages(prev => [...prev, infoMsg].slice(-100));
      }
    } catch (error) {
      const errorMsg: DebugMessage = {
        timestamp: new Date(),
        type: 'warning',
        source: 'backend',
        message: `Using ${backendUrl}. For production logs: https://dashboard.heroku.com/apps/squidgy-back/logs`
      };
      setMessages(prev => [...prev, errorMsg].slice(-100));
    } finally {
      setIsLoadingBackendLogs(false);
    }
  };

  // Auto health check on mount and every 30 seconds
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);
  
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
  
  // Get message color based on type and source
  const getMessageColor = (type: DebugMessage['type'], source?: DebugMessage['source']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'backend':
        return 'text-purple-400';
      case 'n8n':
        return 'text-orange-400';
      case 'database':
        return 'text-cyan-400';
      case 'info':
      default:
        return source === 'backend' ? 'text-purple-300' : 
               source === 'n8n' ? 'text-orange-300' :
               source === 'database' ? 'text-cyan-300' :
               'text-blue-400';
    }
  };

  // Get source icon
  const getSourceIcon = (source?: DebugMessage['source']) => {
    switch (source) {
      case 'backend':
        return <Server size={10} className="inline mr-1" />;
      case 'n8n':
        return <Zap size={10} className="inline mr-1" />;
      case 'database':
        return <Database size={10} className="inline mr-1" />;
      case 'heroku':
        return <Server size={10} className="inline mr-1" />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`bg-black border-t border-gray-700 transition-all duration-300 ${
      isExpanded ? 'h-40' : 'h-10'
    } ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div 
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Code2 size={14} className="text-green-400" />
          <span className="text-sm text-white">WebSocket Debug Console</span>
          <span className={`text-xs px-2 py-1 rounded ${
            status === 'connected' ? 'bg-green-900 text-green-400' : 
            status === 'connecting' ? 'bg-yellow-900 text-yellow-400' :
            'bg-red-900 text-red-400'
          }`}>
            {status}
          </span>
          <span className={`text-xs px-2 py-1 rounded ml-1 ${
            backendHealth === 'healthy' ? 'bg-green-900 text-green-400' : 
            backendHealth === 'checking' ? 'bg-yellow-900 text-yellow-400' :
            'bg-red-900 text-red-400'
          }`}>
            Backend: {backendHealth}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              checkBackendHealth();
            }}
            className="text-gray-400 hover:text-white p-1 rounded"
            title="Refresh backend health"
            disabled={backendHealth === 'checking'}
          >
            <RefreshCw size={12} className={backendHealth === 'checking' ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              fetchBackendLogs();
            }}
            className="text-gray-400 hover:text-white p-1 rounded"
            title="Fetch backend logs"
            disabled={isLoadingBackendLogs}
          >
            <Server size={12} className={isLoadingBackendLogs ? 'animate-pulse' : ''} />
          </button>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
      
      {/* Messages */}
      {isExpanded && (
        <div className="h-[120px] overflow-y-auto p-3 font-mono text-xs custom-scrollbar">
          {mergedMessages.length === 0 ? (
            <div className="text-gray-500">No messages yet...</div>
          ) : (
            mergedMessages.map((msg, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">[{formatTime(msg.timestamp)}]</span>
                {getSourceIcon(msg.source)}
                <span className={`ml-1 ${getMessageColor(msg.type, msg.source)}`}>
                  {msg.message}
                </span>
                {msg.data && (
                  <div className="ml-4 text-gray-400 text-[10px] mt-0.5 whitespace-pre-wrap">
                    {/* Show specific fields for health data */}
                    {msg.data.active_connections !== undefined ? (
                      <>
                        <div><b>Active Connections:</b> {msg.data.active_connections}</div>
                        <div><b>Streaming Sessions:</b> {msg.data.streaming_sessions}</div>
                      </>
                    ) : 
                    /* Show error code and reason if present, else fallback to JSON */
                    ('code' in msg.data || 'reason' in msg.data || 'wasClean' in msg.data) ? (
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