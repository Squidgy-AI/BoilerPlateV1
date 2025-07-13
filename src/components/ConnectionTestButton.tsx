'use client';

import React, { useState } from 'react';

interface ConnectionTestButtonProps {
  onTest: () => void;
  serverAddress?: string;
}

const ConnectionTestButton: React.FC<ConnectionTestButtonProps> = ({ 
  onTest,
  serverAddress = process.env.NEXT_PUBLIC_API_BASE

}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null);
  
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // First try to ping the server with a health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://${serverAddress}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setTestResult('success');
        console.log('Server health check successful');
      } else {
        setTestResult('failure');
        console.error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult('failure');
    } finally {
      setIsTesting(false);
      onTest();
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleTestConnection}
        disabled={isTesting}
        className={`
          px-3 py-1 rounded-md text-xs font-medium
          ${isTesting 
            ? 'bg-gray-500 cursor-wait' 
            : 'bg-blue-600 hover:bg-blue-700'}
          text-white transition-colors
        `}
      >
        {isTesting ? 'Testing...' : 'Test Connection'}
      </button>
      
      {testResult && (
        <div className={`
          flex items-center text-xs px-2 py-1 rounded
          ${testResult === 'success' ? 'bg-green-600' : 'bg-red-600'} 
          text-white
        `}>
          <div className={`
            w-2 h-2 rounded-full mr-1
            ${testResult === 'success' ? 'bg-green-300' : 'bg-red-300'}
          `}></div>
          {testResult === 'success' ? 'Connected' : 'Failed'}
        </div>
      )}
    </div>
  );
};

// Usage in Chatbot or UserDashboard:
// <ConnectionTestButton 
//   onTest={() => {
//     console.log('Connection test initiated');
//     if (connectionStatus === 'disconnected') {
//       connectWebSocket();
//     }
//   }} 
//   serverAddress="" 
// />

export default ConnectionTestButton;