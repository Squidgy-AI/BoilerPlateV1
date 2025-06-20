// src/services/WebSocketService.ts

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export interface WebSocketConfig {
  userId: string;
  sessionId: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onStatusChange?: (status: WebSocketStatus) => void;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  onLog?: (log: { type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any }) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private status: WebSocketStatus = 'disconnected';

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  public get rawWebSocket(): WebSocket | null {
    return this.ws;
  }

  public connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(this.ws);
        return;
      }
      
      this.setStatus('connecting');
      
      // Use the backend URL and replace http/https with ws/wss
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const wsUrl = backendUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:') + 
                   `/ws/${this.config.userId}/${this.config.sessionId}`;
      
      // Log the connecting destination
      if (this.config.onLog) {
        this.config.onLog({
          type: 'info',
          message: `Connecting to WebSocket URL: ${wsUrl}`,
          data: { wsUrl }
        });
      }
      
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
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          
          // Start ping interval
          this.startPingInterval();
          
          if (this.config.onOpen) {
            this.config.onOpen();
          }
          
          resolve(this.ws);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle ping/pong messages
            if (data.type === 'ping') {
              // Respond to server ping with pong
              this.ws?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              return;
            } else if (data.type === 'pong') {
              // Server responded to our ping, connection is alive
              if (this.config.onLog) {
                this.config.onLog({
                  type: 'info',
                  message: 'Received pong from server - connection alive',
                  data: { timestamp: data.timestamp }
                });
              }
              return;
            }
            
            if (this.config.onMessage) {
              this.config.onMessage(data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.setStatus('disconnected');
          this.stopPingInterval();
          if (this.config.onLog) {
            this.config.onLog({
              type: 'error',
              message: `WebSocket closed: ${event.code} ${event.reason || 'No reason'}`,
              data: { code: event.code, reason: event.reason, wasClean: event.wasClean, type: event.type }
            });
          }
          if (this.config.onClose) {
            this.config.onClose();
          }
          // Attempt to reconnect
          this.scheduleReconnect();
          reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.config.onLog) {
            this.config.onLog({
              type: 'error',
              message: 'WebSocket error occurred',
              data: error
            });
          }
          if (this.config.onError) {
            this.config.onError(error);
          }
        };
      } catch (error) {
        this.setStatus('disconnected');
        console.error('Error creating WebSocket:', error);
        if (this.config.onLog) {
          this.config.onLog({
            type: 'error',
            message: 'Error creating WebSocket',
            data: error
          });
        }
        // Attempt to reconnect
        this.scheduleReconnect();
        
        reject(error);
      }
    });
  }
  
  public async sendMessage(message: string, requestId?: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connect();
      } catch (error) {
        throw new Error('Failed to connect to WebSocket server');
      }
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        message,
        requestId: requestId || `req_${Date.now()}`
      }));
    } else {
      throw new Error('WebSocket not connected');
    }
  }
  
  public getStatus(): WebSocketStatus {
    return this.status;
  }
  
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
    
    this.setStatus('disconnected');
  }
  
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      if (this.config.onStatusChange) {
        this.config.onStatusChange(status);
      }
    }
  }
  
  private startPingInterval(): void {
    this.stopPingInterval();
    
    // Send a ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a ping message
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        if (this.config.onLog) {
          this.config.onLog({
            type: 'info',
            message: 'Sent ping to server to keep connection alive'
          });
        }
      }
    }, 30000);
  }
  
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
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
}

export default WebSocketService;