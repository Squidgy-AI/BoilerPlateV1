'use client';

import React, { useState, useEffect, useRef } from 'react';

const WebSocketDebugger = ({ websocket }) => {
  const [messages, setMessages] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionCount, setConnectionCount] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Monitor WebSocket status with more detailed tracking
  useEffect(() => {
    if (!websocket) {
      setConnectionStatus('disconnected');
      return;
    }
    
    // Set initial status based on readyState
    setConnectionStatus(
      websocket.readyState === 0 ? 'connecting' :
      websocket.readyState === 1 ? 'connected' :
      websocket.readyState === 2 ? 'closing' : 'disconnected'
    );
    
    // Update connection count
    setConnectionCount(prev => prev + 1);
    
    // Event listeners for connection status changes
    const handleOpen = () => {
      console.log('WebSocketDebugger: Connection opened');
      setConnectionStatus('connected');
      // Add a connection message to history
      setMessages(prev => [...prev, { 
        timestamp: new Date(), 
        data: { type: 'connection_status', status: 'connected', message: 'WebSocket connected' },
        raw: JSON.stringify({ type: 'connection_status', status: 'connected' })
      }].slice(-30));
    };
    
    const handleClose = (event) => {
      console.log(`WebSocketDebugger: Connection closed (${event.code}: ${event.reason})`);
      setConnectionStatus('disconnected');
      // Add a disconnection message to history
      setMessages(prev => [...prev, { 
        timestamp: new Date(), 
        data: { 
          type: 'connection_status', 
          status: 'disconnected', 
          message: `WebSocket closed (Code: ${event.code}, Reason: ${event.reason || 'No reason'})` 
        },
        raw: JSON.stringify({ type: 'connection_status', status: 'disconnected', code: event.code })
      }].slice(-30));
    };
    
    const handleError = (error) => {
      console.error('WebSocketDebugger: Connection error', error);
      setConnectionStatus('error');
      // Add an error message to history
      setMessages(prev => [...prev, { 
        timestamp: new Date(), 
        data: { type: 'connection_status', status: 'error', message: 'WebSocket connection error' },
        raw: JSON.stringify({ type: 'connection_status', status: 'error' })
      }].slice(-30));
    };
    
    // Check initial state and add connecting message if appropriate
    if (websocket.readyState === 0) {
      setMessages(prev => [...prev, { 
        timestamp: new Date(), 
        data: { type: 'connection_status', status: 'connecting', message: 'WebSocket connecting...' },
        raw: JSON.stringify({ type: 'connection_status', status: 'connecting' })
      }].slice(-30));
    }
    
    websocket.addEventListener('open', handleOpen);
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('error', handleError);
    
    return () => {
      // Clean up event listeners
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('close', handleClose);
      websocket.removeEventListener('error', handleError);
    };
  }, [websocket]);
  
  // Handle message reception
  useEffect(() => {
    if (!websocket) return;
    
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const timestamp = new Date();
        
        // Log received messages for debugging
        console.log('WebSocketDebugger: Message received', data);
        
        setMessages(prev => [...prev, { 
          timestamp, 
          data,
          raw: event.data
        }].slice(-30)); // Keep last 30 messages
      } catch (e) {
        console.error("Error parsing message", e);
        setMessages(prev => [...prev, { 
          timestamp: new Date(), 
          data: { error: "Parse error", message: e.toString() },
          raw: event.data
        }].slice(-30));
      }
    };
    
    websocket.addEventListener('message', handleMessage);
    
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Status indicator color
  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-red-500',
    error: 'bg-purple-500',
    closing: 'bg-orange-500'
  };
  
  // Function to format message for display
  const formatMessage = (msg) => {
    // If it's a tool execution or result, show special formatted version
    if (msg.data.type === 'tool_execution' || msg.data.type === 'tool_result') {
      return (
        <div className="p-1 bg-gray-800 rounded">
          <div className="font-bold">
            {msg.data.type === 'tool_execution' ? '🔧 Tool Call: ' : '📊 Tool Result: '}
            {msg.data.type === 'tool_execution' ? msg.data.tool : msg.data.executionId || msg.data.tool}
          </div>
          <div className="text-xs opacity-75">
            {msg.data.type === 'tool_execution' ? 'Parameters: ' : 'Response: '}
            {msg.data.type === 'tool_execution' 
              ? JSON.stringify(msg.data.params || {}, null, 2)
              : JSON.stringify(msg.data.result || {}, null, 2)
            }
          </div>
        </div>
      );
    }
    
    // For agent responses, show a cleaner version
    if (msg.data.type === 'agent_response') {
      return (
        <div>
          <span className="font-bold">{msg.data.agent || 'Agent'}: </span>
          <span className="text-green-300">{msg.data.message?.substring(0, 100)}{msg.data.message?.length > 100 ? '...' : ''}</span>
          {msg.data.final && <span className="text-blue-300 text-xs ml-2">[Final]</span>}
        </div>
      );
    }
    
    // For errors, highlight them
    if (msg.data.type === 'error') {
      return (
        <div className="bg-red-900 bg-opacity-50 p-1 rounded">
          <span className="font-bold text-red-300">Error: </span>
          <span>{msg.data.message}</span>
        </div>
      );
    }
    
    // For agent thinking, highlight with animation
    if (msg.data.type === 'agent_thinking') {
      return (
        <div className="bg-blue-900 bg-opacity-30 p-1 rounded">
          <span className="font-bold text-blue-300">{msg.data.agent} thinking: </span>
          <span className="animate-pulse">{msg.data.message}</span>
        </div>
      );
    }
    
    // For connection status messages
    if (msg.data.type === 'connection_status') {
      return (
        <div className={`
          p-1 rounded
          ${msg.data.status === 'connected' ? 'bg-green-900 bg-opacity-30' : 
            msg.data.status === 'connecting' ? 'bg-yellow-900 bg-opacity-30' : 
            'bg-red-900 bg-opacity-30'}
        `}>
          <span className="font-bold">Connection: </span>
          <span>{msg.data.status} - {msg.data.message}</span>
        </div>
      );
    }
    
    // For processing_start and similar diagnostic messages
    if (msg.data.type === 'processing_start') {
      return (
        <div className="bg-purple-900 bg-opacity-30 p-1 rounded">
          <span className="font-bold">Processing: </span>
          <span>{msg.data.message}</span>
        </div>
      );
    }
    
    // Default view for other message types
    return (
      <div>
        <span className="font-bold">{msg.data.type}: </span>
        {msg.data.agent && <span className="text-blue-300">{msg.data.agent} </span>}
        {msg.data.message && (
          <span>{msg.data.message.substring(0, 80)}{msg.data.message.length > 80 ? '...' : ''}</span>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-[#1B2431] text-white rounded-lg border border-gray-700 overflow-hidden mb-4">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${statusColor[connectionStatus]}`}></div>
          <h3 className="font-bold text-sm">WebSocket Debug</h3>
          <span className="text-xs ml-2 px-2 bg-gray-700 rounded-full">
            {connectionStatus === 'connecting' ? 
              <span className="animate-pulse">connecting...</span> : 
              connectionStatus
            }
          </span>
          <span className="text-xs ml-2 text-gray-400">
            {connectionCount > 0 ? `${connectionCount} connections` : 'No connections'}
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowRaw(!showRaw)} 
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
          >
            {showRaw ? 'Show Formatted' : 'Show Raw'}
          </button>
          <button 
            onClick={() => setMessages([])} 
            className="px-2 py-1 bg-gray-700 rounded hover:bg-red-700 text-xs"
          >
            Clear
          </button>
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="max-h-[400px] overflow-auto p-2 text-xs">
          {websocket ? (
            messages.length > 0 ? (
              <div>
                {messages.map((msg, i) => (
                  <div key={i} className="mb-2 border-t border-gray-700 pt-1">
                    <div className="flex justify-between text-gray-400">
                      <span>{msg.timestamp.toLocaleTimeString()}</span>
                      <span className="bg-gray-800 px-1 rounded text-[10px]">#{i+1}</span>
                    </div>
                    
                    {showRaw ? (
                      <pre className="whitespace-pre-wrap overflow-x-auto bg-gray-900 p-1 rounded mt-1 text-[10px]">
                        {msg.raw}
                      </pre>
                    ) : (
                      <div className="mt-1">
                        {formatMessage(msg)}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="py-3 text-center text-gray-400">Waiting for messages...</div>
            )
          ) : (
            <div className="py-3 text-center text-red-400">
              WebSocket not connected
              <div className="mt-2 text-gray-400">
                Check server logs for connection issues
              </div>
              <div className="mt-3">
                <div className="bg-blue-900 bg-opacity-30 p-2 rounded text-sm">
                  <div className="font-bold">Connection Troubleshooting:</div>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Make sure server is running on 127.0.0.1:8080</li>
                    <li>Check browser console for connection errors</li>
                    <li>Verify WebSocket endpoint URL is correct</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Quick connection status - always visible even when collapsed */}
      {!expanded && websocket && (
        <div className="px-2 py-1 text-xs border-t border-gray-700">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-1 ${statusColor[connectionStatus]}`}></div>
            <span>
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
            {messages.length > 0 && (
              <span className="ml-1 text-gray-400">
                ({messages.length} messages)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketDebugger;