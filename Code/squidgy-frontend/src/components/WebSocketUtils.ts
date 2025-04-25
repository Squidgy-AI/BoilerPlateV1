// WebSocketUtils.ts - Shared utilities for WebSocket handling

/**
 * Processes an image path from WebSocket tool results to ensure it has the full URL
 */
export const processImagePath = (
    path: string | undefined, 
    toolName: string, 
    apiBase: string | undefined
  ): string => {
    // Check if path is a string and not empty
    if (!path || typeof path !== 'string') return '';
    
    // If it's already a full URL, return it as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // If apiBase is not provided, return the path as is
    if (!apiBase) {
      return path;
    }
    
    // If it starts with /static/, add the API base
    if (path.startsWith('/static/')) {
      return `https://${apiBase}${path}`;
    }
    
    // Determine the appropriate folder based on tool
    let folder = '';
    if (toolName === 'capture_website_screenshot' || toolName.includes('screenshot')) {
      folder = 'screenshots';
    } else if (toolName === 'get_website_favicon' || toolName.includes('favicon')) {
      folder = 'favicons';
    } else {
      folder = 'static'; // Default fallback
    }
    
    // Extract just the filename if the path contains slashes
    const filename = path.includes('/') ? path.split('/').pop() : path;
    
    // Construct and return the full URL
    return `https://${apiBase}/static/${folder}/${filename}`;
  };
  
  /**
   * Processes WebSocket tool results for consistent handling across components
   */
  export const processToolResult = (
    data: any, 
    apiBase: string | undefined
  ): { type: string, path?: string, analysis?: string } => {
    const toolName = data.tool || 
                    (data.executionId ? data.executionId.split('-')[0] : '');
    
    let result: { type: string, path?: string, analysis?: string } = {
      type: toolName
    };
    
    // Handle image-related tools
    if (toolName === 'capture_website_screenshot' || toolName === 'get_website_favicon') {
      let imagePath = '';
      
      // Extract path from different result formats
      if (typeof data.result === 'object' && data.result && data.result.path) {
        imagePath = data.result.path;
      } else if (typeof data.result === 'string') {
        imagePath = data.result;
      }
      
      // Process the path to ensure it has the full URL
      result.path = processImagePath(imagePath, toolName, apiBase);
    }
    
    // Handle analysis-related tools
    if (toolName === 'analyze_with_perplexity' || toolName === 'perplexity') {
      if (typeof data.result === 'object' && data.result && data.result.analysis) {
        result.analysis = data.result.analysis;
      } else if (typeof data.result === 'string') {
        result.analysis = data.result;
      }
    }
    
    return result;
  };
  
  /**
   * Helper to add debug information to console logs
   */
  export const logWebSocketEvent = (
    eventType: string, 
    data: any, 
    component: string
  ): void => {
    console.log(`[${component}] WebSocket ${eventType}:`, data);
    
    if (data.tool || data.executionId) {
      console.log(`[${component}] Tool: ${data.tool || data.executionId?.split('-')[0]}`);
    }
    
    if (data.result) {
      console.log(`[${component}] Result:`, typeof data.result === 'object' ? 
        JSON.stringify(data.result).substring(0, 100) + '...' : 
        data.result);
    }
  };
  
  export default {
    processImagePath,
    processToolResult,
    logWebSocketEvent
  };


  /**
 * Creates an optimized WebSocket connection with faster timeouts and better retry logic
 */
export const createOptimizedWebSocketConnection = (
    url: string,
    onOpen: (ws: WebSocket) => void,
    onMessage: (event: MessageEvent) => void,
    onClose: (event: CloseEvent) => void,
    onError: (event: Event) => void,
    timeoutMs: number = 3000 // Default to 3 second timeout instead of standard 30+
  ): { 
    websocket: WebSocket | null,
    cancelConnection: () => void 
  } => {
    let ws: WebSocket | null = null;
    let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
    
    try {
      // Create the WebSocket
      ws = new WebSocket(url);
      
      // Set timeout for initial connection
      connectionTimeoutId = setTimeout(() => {
        if (ws && ws.readyState === 0) { // Still in CONNECTING state
          console.log(`WebSocket connection timed out after ${timeoutMs}ms`);
          ws.close();
          // This will trigger onclose event
        }
      }, timeoutMs);
      
      // Set up event handlers
      ws.onopen = (event) => {
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        onOpen(ws as WebSocket);
      };
      
      ws.onmessage = onMessage;
      
      ws.onclose = (event) => {
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        onClose(event);
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        onError(event);
        // No need to close here, as onerror is usually followed by onclose
      };
      
      // Priority handling to make sure connections happen faster
      if (ws.readyState === WebSocket.OPEN) {
        // Already open, call the handler immediately
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        onOpen(ws);
      }
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      // Notify about the error
      onError(new Event('error'));
    }
    
    // Return the WebSocket and a function to cancel the connection
    return {
      websocket: ws,
      cancelConnection: () => {
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        if (ws) {
          ws.close();
          ws = null;
        }
      }
    };
  };


  // Replace the processImagePath function with this more robust version:

/**
 * Processes an image path from WebSocket tool results to ensure it has the full URL
 */
