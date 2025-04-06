'use client';

import React, { useEffect, useState, useRef } from 'react';
import '../animations.css'; // Import the animations CSS

interface ThinkingEvent {
  type: 'agent_thinking' | 'agent_update' | 'processing_start' | 'error' | 'ack';
  agent?: string;
  message: string;
  requestId: string;
  final?: boolean;
  timestamp?: number;
  progress?: number; // Optional progress indicator (0-100)
}

interface Agent {
  name: string;
  color: string;
  icon: string;
  description: string;
}

interface ThinkingProcessProps {
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
  sessionId: string;
}

// Agent definitions with visual styling
const AGENTS: Record<string, Agent> = {
  'ProductManager': {
    name: 'Product Manager',
    color: 'blue',
    icon: '📊',
    description: 'Planning and coordinating'
  },
  'PreSalesConsultant': {
    name: 'Pre-Sales Consultant',
    color: 'green',
    icon: '🔍',
    description: 'Analyzing requirements'
  },
  'SocialMediaManager': {
    name: 'Social Media Manager',
    color: 'pink',
    icon: '📱',
    description: 'Digital strategy'
  },
  'LeadGenSpecialist': {
    name: 'Lead Gen Specialist',
    color: 'yellow',
    icon: '📞',
    description: 'Opportunity management'
  }
};

// Default agent for when agent name is not recognized
const DEFAULT_AGENT: Agent = {
  name: 'Squidgy',
  color: 'purple',
  icon: '🤖',
  description: 'AI Assistant'
};

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  websocket,
  currentRequestId,
  isProcessing,
  sessionId
}) => {
  const [events, setEvents] = useState<ThinkingEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [processingPhase, setProcessingPhase] = useState<string>('initializing');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-expand on first event then collapse after a delay when processing completes
  useEffect(() => {
    if (events.length === 1) {
      setExpanded(true);
    }
    
    if (!isProcessing && events.length > 0) {
      // Keep events expanded for a short while after processing completes
      const timer = setTimeout(() => {
        setExpanded(false);
        // Then clear events after collapse animation completes
        const clearTimer = setTimeout(() => {
          setEvents([]);
          setActiveAgents(new Set());
          setProcessingPhase('initializing');
        }, 500); // Match the collapse transition duration
        
        return () => clearTimeout(clearTimer);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isProcessing, events.length]);
  
  // Track which agents are active based on events
  useEffect(() => {
    const agents = new Set<string>();
    events.forEach(event => {
      if (event.agent) {
        agents.add(event.agent);
      }
    });
    setActiveAgents(agents);
    
    // Update processing phase based on events
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === 'processing_start') {
        setProcessingPhase('initializing');
      } else if (lastEvent.agent === 'ProductManager') {
        setProcessingPhase('planning');
      } else if (lastEvent.agent === 'PreSalesConsultant') {
        setProcessingPhase('analyzing');
      } else if (lastEvent.agent === 'SocialMediaManager') {
        setProcessingPhase('strategizing');
      } else if (lastEvent.agent === 'LeadGenSpecialist') {
        setProcessingPhase('coordinating');
      }
    }
  }, [events]);
  
  // Handle websocket messages
  useEffect(() => {
    if (!websocket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only process events related to the current request
        if (data.requestId === currentRequestId) {
          // Filter events we want to display
          if (['agent_thinking', 'agent_update', 'processing_start'].includes(data.type)) {
            setEvents(prevEvents => {
              // Add timestamp and random progress indicator to track animation
              const newEvent = {
                ...data,
                timestamp: Date.now(),
                progress: Math.floor(Math.random() * 100) // Random progress for visual effect
              };
              
              // Keep only the most recent events (limited to last 8)
              const updatedEvents = [...prevEvents, newEvent].slice(-8);
              return updatedEvents;
            });
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    websocket.addEventListener('message', handleMessage);
    
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket, currentRequestId]);
  
  // Scroll to the bottom when new events arrive
  useEffect(() => {
    if (containerRef.current && expanded) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, expanded]);
  
  // Get agent info with fallback to default
  const getAgentInfo = (agentName?: string): Agent => {
    if (!agentName) return DEFAULT_AGENT;
    return AGENTS[agentName] || DEFAULT_AGENT;
  };
  
  // Don't render if not processing or no events
  if (!isProcessing || events.length === 0) {
    return null;
  }
  
  // Get the latest event for the header
  const latestEvent = events[events.length - 1];
  const latestAgent = getAgentInfo(latestEvent.agent);
  
  return (
    <div className={`bg-[#2D3B4F] rounded-lg transition-all duration-300 mb-4 overflow-hidden ${
      expanded ? 'max-h-80' : 'max-h-16'
    }`}>
      {/* Header with toggle */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-700 animate-shimmer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
          <span className="text-blue-300 font-medium">
            {latestAgent.icon} {latestAgent.name}: 
            <span className="ml-2 text-gray-300 animate-typewriter">
              {processingPhase === 'initializing' ? 'Initializing...' :
               processingPhase === 'planning' ? 'Planning approach...' :
               processingPhase === 'analyzing' ? 'Analyzing data...' :
               processingPhase === 'strategizing' ? 'Developing strategy...' :
               processingPhase === 'coordinating' ? 'Coordinating response...' :
               'Processing...'}
            </span>
          </span>
        </div>
        
        {/* Agent activity indicators */}
        <div className="flex items-center space-x-2 mr-3">
          {Object.entries(AGENTS).map(([key, agent]) => (
            <div 
              key={key}
              className={`w-2 h-2 rounded-full ${
                activeAgents.has(key) 
                  ? `bg-${agent.color}-400 animate-pulse`
                  : 'bg-gray-600'
              }`}
              title={`${agent.name}: ${activeAgents.has(key) ? 'Active' : 'Inactive'}`}
            />
          ))}
        </div>
        
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`text-gray-400 transition-transform duration-200 ${
            expanded ? 'transform rotate-180' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      {/* Events list with timeline visualization */}
      <div 
        ref={containerRef}
        className="overflow-y-auto max-h-64 p-3 text-sm relative"
      >
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700 z-0"></div>
        
        {events.map((event, index) => {
          const agent = getAgentInfo(event.agent);
          const isLatest = index === events.length - 1;
          const timeAgo = event.timestamp ? Math.floor((Date.now() - event.timestamp) / 1000) : 0;
          
          return (
            <div 
              key={index}
              className={`relative py-1 px-2 ml-5 pl-4 rounded mb-3 transition-all duration-500 
                ${isLatest ? 'animate-fadeIn' : ''}
                ${event.agent ? `bg-agent-${event.agent.toLowerCase().replace('specialist', '')}` : 'bg-gray-800 bg-opacity-30'}`}
            >
              {/* Timeline dot */}
              <div className={`absolute left-[-12px] top-3 w-4 h-4 rounded-full 
                border-2 border-gray-800 z-10 
                ${event.type === 'processing_start' ? 'bg-blue-500' : 
                  event.type === 'agent_thinking' ? 'bg-yellow-500' : 
                  'bg-green-500'}`}>
              </div>
              
              {/* Event content */}
              {event.type === 'processing_start' ? (
                <div className="text-gray-300">{event.message}</div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <span className={`text-${agent.color}-400 font-medium mr-2`}>{agent.icon} {agent.name}</span>
                      <span className="text-xs text-gray-400">{agent.description}</span>
                    </div>
                    <span className="text-xs text-gray-500">{timeAgo}s ago</span>
                  </div>
                  
                  {/* Progress bar if available */}
                  {event.progress !== undefined && (
                    <div className="h-1 bg-gray-700 rounded-full mb-2 overflow-hidden">
                      <div 
                        className={`h-full bg-${agent.color}-500 rounded-full`} 
                        style={{width: `${event.progress}%`}}
                      ></div>
                    </div>
                  )}
                  
                  <span className="text-gray-300">{event.message}</span>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Session info */}
        <div className="text-xs text-gray-500 border-t border-gray-700 mt-2 pt-2 ml-5">
          <div className="flex justify-between">
            <span>Session: {sessionId.substring(0, 8)}...</span>
            <span>Request: {currentRequestId?.substring(0, 8)}...</span>
            <span>Phase: {processingPhase}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingProcess;