import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketHookOptions {
  userId: string;
  sessionId: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectLimit?: number;
  reconnectInterval?: number;
}

interface WebSocketHookState {
  websocket: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected';
  currentRequestId: string | null;
  isProcessing: boolean;
  error: Error | null;
  lastMessage: any | null;
  send: (message: string, requestId?: string) => void;
  reconnect: () => void;
}

/**
 * Custom hook to manage WebSocket connection and state
 */
const useWebSocketConnection = ({
  userId,
  sessionId,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectLimit = 5,
  reconnectInterval = 2000
}: WebSocketHookOptions): WebSocketHookState => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Function to establish WebSocket connection
  const connect = useCallback(() => {
    if (!userId || !sessionId) return;
    
    // Close existing connection
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setStatus('connecting');
    
    try {
      // Use dynamic URL based on environment
      // Line ~109 in connect function
      const wsProtocol = 'wss:'; // Always use secure WebSockets with Heroku
      const wsBase = process.env.NEXT_PUBLIC_API_BASE;
      const wsUrl = `${wsProtocol}//${wsBase}/ws/${userId}/${sessionId}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        websocketRef.current = ws;
        
        if (onConnect) {
          onConnect();
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          
          // Update last message
          setLastMessage(data);
          
          // Process message based on type
          switch (data.type) {
            case 'ack':
              // Message acknowledged
              break;
              
            case 'processing_start':
            case 'agent_thinking':
            case 'agent_update':
              // Update processing status and request ID
              setIsProcessing(true);
              break;
              
            case 'agent_response':
              if (data.final) {
                // Clear processing state when final response received
                setIsProcessing(false);
                if (currentRequestId === data.requestId) {
                  setCurrentRequestId(null);
                }
              }
              break;
              
            case 'error':
              // Handle error
              setIsProcessing(false);
              if (currentRequestId === data.requestId) {
                setCurrentRequestId(null);
              }
              setError(new Error(data.message || 'Unknown WebSocket error'));
              break;
          }
          
          // Call onMessage callback if provided
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        websocketRef.current = null;
        setStatus('disconnected');
        
        if (onDisconnect) {
          onDisconnect();
        }
        
        // Attempt to reconnect if not intentionally closed
        if (reconnectAttemptsRef.current < reconnectLimit) {
          reconnectAttemptsRef.current++;
          const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          
          console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError(new Error('Maximum reconnection attempts reached'));
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        
        if (onError) {
          onError(event);
        }
        
        setError(new Error('WebSocket connection error'));
        // The onclose handler will be called after this
      };
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setStatus('disconnected');
      setError(error instanceof Error ? error : new Error('Failed to create WebSocket connection'));
    }
  }, [userId, sessionId, onConnect, onDisconnect, onError, onMessage, reconnectLimit, reconnectInterval]);
  
  // Function to send message via WebSocket
  const send = useCallback((message: string, requestId?: string) => {
    if (!websocketRef.current || status !== 'connected') {
      setError(new Error('Cannot send message: WebSocket not connected'));
      return;
    }
    
    try {
      // Generate a request ID if not provided
      const msgRequestId = requestId || `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Update current request ID
      setCurrentRequestId(msgRequestId);
      setIsProcessing(true);
      
      // Send the message
      websocketRef.current.send(JSON.stringify({
        message,
        requestId: msgRequestId
      }));
      
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      setError(error instanceof Error ? error : new Error('Failed to send WebSocket message'));
    }
  }, [status]);
  
  // Function to manually reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    connect();
  }, [connect]);
  
  // Connect when component mounts or when userId/sessionId changes
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect, userId, sessionId]);
  
  return {
    websocket: websocketRef.current,
    status,
    currentRequestId,
    isProcessing,
    error,
    lastMessage,
    send,
    reconnect
  };
};

export default useWebSocketConnection;