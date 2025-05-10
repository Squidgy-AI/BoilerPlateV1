// src/components/ConnectionStatus.tsx
'use client';

import React from 'react';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  className = '',
  showLabel = true,
  size = 'md'
}) => {
  // Get status colors and text
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          bgColor: 'bg-green-600',
          dotColor: 'bg-green-500',
          text: 'Connected',
          animate: false
        };
      case 'connecting':
        return {
          bgColor: 'bg-yellow-600',
          dotColor: 'bg-yellow-500',
          text: 'Connecting...',
          animate: true
        };
      case 'disconnected':
      default:
        return {
          bgColor: 'bg-red-600',
          dotColor: 'bg-red-500',
          text: 'Disconnected',
          animate: false
        };
    }
  };

  const config = getStatusConfig();

  // Get size styles
  const sizeStyles = {
    sm: {
      dot: 'w-2 h-2',
      text: 'text-xs',
      padding: 'px-2 py-1'
    },
    md: {
      dot: 'w-2.5 h-2.5',
      text: 'text-sm',
      padding: 'px-3 py-1.5'
    },
    lg: {
      dot: 'w-3 h-3',
      text: 'text-base',
      padding: 'px-4 py-2'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`
        ${styles.dot} 
        rounded-full 
        mr-2 
        ${config.dotColor} 
        ${config.animate ? 'animate-pulse' : ''}
      `} />
      {showLabel && (
        <span className={`
          ${styles.text} 
          ${config.bgColor} 
          text-white 
          ${styles.padding} 
          rounded
        `}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;