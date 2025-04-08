'use client';

import React, { useEffect, useState } from 'react';
import ToolExecutionVisualizer from './ToolExecutionVisualizer';
import ThinkingProcess from './ThinkingProcess';
import "../animations.css"; // Import animations

// Mock event data for demonstration
const MOCK_EVENTS = [
  {
    type: 'tool_execution',
    tool: 'perplexity',
    params: { url: 'https://example.com' },
    requestId: 'request-123'
  },
  {
    type: 'tool_result',
    executionId: 'perplexity-123',
    result: {
      analysis: "--- *Company name*: Example Inc\n--- *Website*: https://example.com\n--- *Description*: A technology company specializing in web solutions.\n--- *Tags*: Technology.Web Development.SaaS\n--- *Takeaways*: Scalable infrastructure, innovative solutions\n--- *Niche*: Enterprise web applications\n--- *Contact Information*: contact@example.com"
    },
    requestId: 'request-123'
  },
  {
    type: 'tool_execution',
    tool: 'screenshot',
    params: { url: 'https://example.com' },
    requestId: 'request-123'
  },
  {
    type: 'tool_result',
    executionId: 'screenshot-123',
    result: { path: '/static/screenshots/example.png' },
    requestId: 'request-123'
  }
];

interface EnhancedUserDashboardProps {
  userId: string;
  currentSessionId: string;
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
  websiteData?: {
    url?: string;
    favicon?: string;
    screenshot?: string;
  };
  // Other props as needed...
}

const EnhancedUserDashboard: React.FC<EnhancedUserDashboardProps> = ({
  userId,
  currentSessionId,
  websocket,
  currentRequestId,
  isProcessing,
  websiteData
}) => {
  // State to toggle between different visualizers
  const [activeVisualizer, setActiveVisualizer] = useState<'thinking' | 'tools'>('thinking');
  
  // For demo purposes: a timer to switch between visualizers
  useEffect(() => {
    if (isProcessing) {
      // Start with thinking process
      setActiveVisualizer('thinking');
      
      // After a short delay, show tool execution
      const timer = setTimeout(() => {
        setActiveVisualizer('tools');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);
  
  // Inject mock events for demo purposes
  useEffect(() => {
    if (websocket && isProcessing) {
      // Simulating events coming through the websocket for demo
      let delay = 0;
      
      MOCK_EVENTS.forEach(event => {
        setTimeout(() => {
          // Add unique IDs for demo
          if (event.type === 'tool_execution') {
            event.executionId = `${event.tool}-${Date.now()}`;
          }
          
          // Create a fake message event
          const mockEvent = new MessageEvent('message', {
            data: JSON.stringify(event)
          });
          
          // Dispatch to the websocket's onmessage handler
          if (websocket.onmessage) {
            websocket.onmessage(mockEvent);
          }
        }, delay);
        
        delay += 3000; // Each event 3 seconds apart
      });
    }
  }, [websocket, isProcessing]);
  
  return (
    <div className="w-full h-full bg-[#1B2431] text-white flex flex-col p-8">
      {/* User Profile Section */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Squidgy Dashboard</h1>
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xl">{userId.charAt(0).toUpperCase()}</span>
        </div>
      </div>
      
      {/* Visualizer Selector Tabs */}
      {isProcessing && (
        <div className="mb-4">
          <div className="flex border-b border-gray-700">
            <button
              className={`py-2 px-4 font-medium ${
                activeVisualizer === 'thinking' 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveVisualizer('thinking')}
            >
              Thinking Process
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeVisualizer === 'tools' 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveVisualizer('tools')}
            >
              Tool Execution
            </button>
          </div>
        </div>
      )}
      
      {/* Thinking Process Visualization */}
      {activeVisualizer === 'thinking' && isProcessing && (
        <ThinkingProcess
          websocket={websocket}
          currentRequestId={currentRequestId}
          isProcessing={isProcessing}
          sessionId={currentSessionId}
        />
      )}
      
      {/* Tool Execution Visualization */}
      {activeVisualizer === 'tools' && (
        <ToolExecutionVisualizer
          websocket={websocket}
          currentRequestId={currentRequestId}
          isProcessing={isProcessing}
        />
      )}
      
      {/* Website Analysis Section */}
      {websiteData && websiteData.url && (
        <div className="mb-8 bg-[#2D3B4F] rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Website Analysis</h2>
          
          <div className="flex items-center mb-4">
            {websiteData.favicon && (
              <div className="mr-4 w-12 h-12 relative">
                <img 
                  src={websiteData.favicon}
                  alt="Website Favicon"
                  width={48}
                  height={48}
                  className="rounded-md"
                />
              </div>
            )}
            <a 
              href={websiteData.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {websiteData.url}
            </a>
          </div>
          
          {websiteData.screenshot && (
            <div className="w-full h-48 relative rounded-lg overflow-hidden">
              <img
                src={websiteData.screenshot}
                alt="Website Screenshot"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Rest of user dashboard content remains the same */}
      <div className="flex-grow">
        {/* Placeholder for session list, topic suggestions, etc. */}
      </div>
    </div>
  );
};

export default EnhancedUserDashboard;