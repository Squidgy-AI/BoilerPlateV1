'use client';

import React, { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  websocket: WebSocket | null;
  isAttemptingConnection?: boolean;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  websocket,
  isAttemptingConnection = false,
  className = '',
  showLabel = true,
  size = 'md',
  onStatusChange
}) => {
  // Current connection status
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    websocket ? 
      websocket.readyState === WebSocket.OPEN ? 'connected' : 
      websocket.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected' 
    : isAttemptingConnection ? 'connecting' : 'disconnected'
  );

  // Update status when websocket or isAttemptingConnection changes
  useEffect(() => {
    let newStatus: 'connected' | 'connecting' | 'disconnected';
    
    if (websocket) {
      // Determine status based on WebSocket readyState
      if (websocket.readyState === WebSocket.OPEN) {
        newStatus = 'connected';
      } else if (websocket.readyState === WebSocket.CONNECTING) {
        newStatus = 'connecting';
      } else {
        newStatus = 'disconnected';
      }
    } else {
      // No WebSocket, determine status based on isAttemptingConnection
      newStatus = isAttemptingConnection ? 'connecting' : 'disconnected';
    }
    
    // Only update if the status has changed
    if (newStatus !== connectionStatus) {
      setConnectionStatus(newStatus);
      
      // Notify parent component if callback provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    }
  }, [websocket, isAttemptingConnection, connectionStatus, onStatusChange]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!websocket) return;

    // Define event handlers
    const handleOpen = () => {
      setConnectionStatus('connected');
      if (onStatusChange) onStatusChange('connected');
    };
    
    const handleClose = () => {
      setConnectionStatus('disconnected');
      if (onStatusChange) onStatusChange('disconnected');
    };
    
    const handleError = () => {
      setConnectionStatus('disconnected');
      if (onStatusChange) onStatusChange('disconnected');
    };

    // Add event listeners
    websocket.addEventListener('open', handleOpen);
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('error', handleError);

    // Clean up on unmount
    return () => {
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('close', handleClose);
      websocket.removeEventListener('error', handleError);
    };
  }, [websocket, onStatusChange]);

  // Get indicator size
  const getIndicatorSize = () => {
    switch (size) {
      case 'sm': return 'w-2 h-2';
      case 'lg': return 'w-4 h-4';
      default: return 'w-3 h-3';
    }
  };

  // Get container classes
  const getContainerClasses = () => {
    switch (size) {
      case 'sm': return 'py-0.5 px-2 text-xs';
      case 'lg': return 'py-2 px-4 text-base';
      default: return 'py-1 px-3 text-sm';
    }
  };

  // Status colors and styles
  const statusStyles = {
    connected: {
      bg: 'bg-green-600', 
      text: 'text-white',
      dot: 'bg-green-300'
    },
    connecting: {
      bg: 'bg-yellow-600', 
      text: 'text-white',
      dot: 'bg-yellow-300 animate-pulse'
    },
    disconnected: {
      bg: 'bg-red-600', 
      text: 'text-white',
      dot: 'bg-red-300'
    }
  };

  const currentStyle = statusStyles[connectionStatus];

  return (
    <div className={`
      inline-flex items-center rounded-full 
      ${getContainerClasses()} 
      ${currentStyle.bg} 
      ${currentStyle.text}
      ${className}
    `}>
      <div className={`
        ${getIndicatorSize()} 
        rounded-full mr-2 
        ${currentStyle.dot}
      `} />
      {showLabel && (
        <span>
          {connectionStatus === 'connected' ? 'Connected' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;