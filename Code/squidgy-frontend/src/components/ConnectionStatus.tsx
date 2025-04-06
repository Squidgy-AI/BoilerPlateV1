'use client';

import React, { useEffect, useState } from 'react';

// Animation keyframes for pulsing effect
const pulseAnimation = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-custom {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

interface ConnectionStatusProps {
  websocket: WebSocket | null;
  isAttemptingConnection?: boolean;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  websocket,
  isAttemptingConnection = false,
  className = '',
  showLabel = true,
  size = 'md'
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    websocket ? 
      websocket.readyState === 1 ? 'connected' : 
      websocket.readyState === 0 ? 'connecting' : 'disconnected' 
    : isAttemptingConnection ? 'connecting' : 'disconnected'
  );

  // Update status when websocket or isAttemptingConnection changes
  useEffect(() => {
    if (websocket) {
      const newStatus = websocket.readyState === 1 ? 'connected' : 
                        websocket.readyState === 0 ? 'connecting' : 'disconnected';
      
      if (newStatus !== connectionStatus) {
        setConnectionStatus(newStatus);
      }
    } else if (isAttemptingConnection) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [websocket, isAttemptingConnection]);

  // Add event listeners to track websocket status changes
  useEffect(() => {
    if (!websocket) return;

    const handleOpen = () => setConnectionStatus('connected');
    const handleClose = () => setConnectionStatus('disconnected');
    const handleError = () => setConnectionStatus('disconnected');

    websocket.addEventListener('open', handleOpen);
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('error', handleError);

    return () => {
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('close', handleClose);
      websocket.removeEventListener('error', handleError);
    };
  }, [websocket]);

  // Get indicator size based on size prop
  const getIndicatorSize = () => {
    switch (size) {
      case 'sm': return 'w-2 h-2';
      case 'lg': return 'w-4 h-4';
      default: return 'w-3 h-3';
    }
  };

  // Get container classes based on size prop
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
      dot: 'bg-yellow-300 animate-pulse-custom'
    },
    disconnected: {
      bg: 'bg-red-600', 
      text: 'text-white',
      dot: 'bg-red-300'
    }
  };

  const currentStyle = statusStyles[connectionStatus];

  return (
    <>
      <style jsx>{pulseAnimation}</style>
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
    </>
  );
};

export default ConnectionStatus;