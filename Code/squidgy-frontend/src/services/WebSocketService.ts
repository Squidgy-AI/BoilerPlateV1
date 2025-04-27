// src/services/WebSocketService.ts
import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  agent?: string;
  message?: string;
  requestId?: string;
  executionId?: string;
  tool?: string;
  params?: any;
  result?: any;
  final?: boolean;
  timestamp?: number;
}

export interface WebSocketConfig {
  userId: string;
  sessionId: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private pendingMessages: { data: any, resolver: Function, rejecter: Function }[] = [];

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(this.ws);
        return;
      }
      
      this.connectionStatus = 'connecting';
      this.emit('status_change', 'connecting');
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase = process.env.NEXT_PUBLIC_API_BASE;
      const wsUrl = `${wsProtocol}//${wsBase}/ws/${this.config.userId}/${this.config.sessionId}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 8000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          this.emit('status_change', 'connected');
          
          // Process any pending messages
          this.processPendingMessages();
          
          // Start ping interval to keep connection alive
          this.startPingInterval();
          
          if (this.config.onOpen) {
            this.config.onOpen();
          }
          
          resolve(this.ws);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('message', data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.connectionStatus = 'disconnected';
          this.emit('status_change', 'disconnected');
          this.stopPingInterval();
          
          if (this.config.onClose) {
            this.config.onClose();
          }
          
          // Attempt to reconnect
          this.scheduleReconnect();
          
          reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          
          if (this.config.onError) {
            this.config.onError(error);
          }
        };
      } catch (error) {
        this.connectionStatus = 'disconnected';
        this.emit('status_change', 'disconnected');
        console.error('Error creating WebSocket:', error);
        
        // Attempt to reconnect
        this.scheduleReconnect();
        
        reject(error);
      }
    });
  }
  
  /**
   * Send a message via WebSocket
   */
  public sendMessage(message: string, requestId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Queue the message to send when connection is established
        this.pendingMessages.push({
          data: { message, requestId: requestId || `req_${Date.now()}` },
          resolver: resolve,
          rejecter: reject
        });
        
        // Try to connect
        this.connect().catch(() => {
          // Connection attempt will be made by scheduleReconnect
        });
        
        return;
      }
      
      try {
        this.ws.send(JSON.stringify({
          message,
          requestId: requestId || `req_${Date.now()}`
        }));
        resolve();
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Process any pending messages after connection is established
   */
  private processPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const { data, resolver, rejecter } = this.pendingMessages.shift()!;
      
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(data));
          resolver();
        } else {
          rejecter(new Error('WebSocket not connected'));
        }
      } catch (error) {
        rejecter(error);
      }
    }
  }
  
  /**
   * Start a ping interval to keep the connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    
    // Send a ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a ping message
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  
  /**
   * Stop the ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Use exponential backoff
    const delay = Math.min(
      (this.config.reconnectInterval || 2000) * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    if (this.config.onReconnect) {
      this.config.onReconnect(this.reconnectAttempts);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect will be scheduled again by the onclose handler
      });
    }, delay);
  }
  
  /**
   * Close the WebSocket connection
   */
  public close(): void {
    this.stopPingInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectionStatus = 'disconnected';
    this.emit('status_change', 'disconnected');
  }
  
  /**
   * Get the current connection status
   */
  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }
}

// Singleton instance
let websocketInstance: WebSocketService | null = null;

export const getWebSocketService = (config: WebSocketConfig): WebSocketService => {
  if (!websocketInstance || 
      websocketInstance.config.userId !== config.userId || 
      websocketInstance.config.sessionId !== config.sessionId) {
    
    // Close existing instance if it exists
    if (websocketInstance) {
      websocketInstance.close();
    }
    
    websocketInstance = new WebSocketService(config);
  }
  
  return websocketInstance;
};

export default WebSocketService;