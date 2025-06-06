'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Lightbulb, ChevronRight, Database } from 'lucide-react';

interface ThinkingProcessProps {
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
  sessionId: string;
}

interface ThinkingStep {
  agent: string;
  status: 'waiting' | 'thinking' | 'complete';
  message: string;
  icon: React.ReactNode;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  websocket,
  currentRequestId,
  isProcessing,
  sessionId
}) => {
  // State for agent thinking steps
    const [steps, setSteps] = useState<ThinkingStep[]>([
    {
      agent: 'PreSalesConsultant',
      status: 'waiting', 
      message: 'Analyzing requirements...',
      icon: <Lightbulb className="text-green-400" size={20} />
    },
    {
      agent: 'SocialMediaManager',
      status: 'waiting',
      message: 'Developing strategy...',
      icon: <Database className="text-purple-400" size={20} />
    },
    {
      agent: 'LeadGenSpecialist',
      status: 'waiting',
      message: 'Identifying opportunities...',
      icon: <Brain className="text-blue-400" size={20} />
    }
  ]);
  
  // Current agent thinking
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  
  // Current thinking message
  const [currentMessage, setCurrentMessage] = useState<string>('');
  
  // WebSocket message handler
  useEffect(() => {
    if (!websocket || !isProcessing) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only process messages for the current request
        if (data.requestId !== currentRequestId) return;
        
        // Handle different message types
        switch (data.type) {
          case 'processing_start':
            // Reset all steps to waiting
            setSteps(prevSteps => prevSteps.map(step => ({
              ...step,
              status: 'waiting'
            })));
            setCurrentAgent('System');
            setCurrentMessage('Starting processing pipeline...');
            break;
            
          case 'agent_thinking':
            // Update current agent and message
            setCurrentAgent(data.agent);
            setCurrentMessage(data.message);
            
            // Update step status
            setSteps(prevSteps => prevSteps.map(step => ({
              ...step,
              status: step.agent === data.agent ? 'thinking' : 
                     step.status === 'complete' ? 'complete' : 'waiting'
            })));
            break;
            
          case 'agent_update':
            // Update current message
            setCurrentMessage(data.message);
            break;
            
          case 'agent_response':
            if (data.final) {
              // Mark all steps as complete
              setSteps(prevSteps => prevSteps.map(step => ({
                ...step,
                status: 'complete'
              })));
              setCurrentAgent(null);
              setCurrentMessage('');
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message in ThinkingProcess:', error);
      }
    };
    
    websocket.addEventListener('message', handleMessage);
    
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket, currentRequestId, isProcessing]);
  
  // Reset on session change
  useEffect(() => {
    // Reset all steps to waiting
    setSteps(prevSteps => prevSteps.map(step => ({
      ...step,
      status: 'waiting'
    })));
    setCurrentAgent(null);
    setCurrentMessage('');
  }, [sessionId]);
  
  // Don't render if not processing
  if (!isProcessing) return null;
  
  return (
    <div className="mb-6 bg-[#2D3B4F] rounded-lg p-4 overflow-hidden">
      <h3 className="text-lg font-bold text-white mb-4">Processing Pipeline</h3>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start">
            <div className={`
              flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-3
              ${step.status === 'waiting' ? 'bg-gray-700' : 
                step.status === 'thinking' ? 'bg-blue-900 animate-pulse' :
                'bg-green-900'}
            `}>
              {step.icon}
            </div>
            
            <div className="flex-grow">
              <div className="flex items-center">
                <span className="font-medium text-white">{step.agent}</span>
                {step.status === 'thinking' && currentAgent === step.agent && (
                  <div className="ml-2 flex items-center bg-blue-900 bg-opacity-50 px-2 py-1 rounded-full text-xs text-blue-300">
                    <span className="animate-pulse mr-1">●</span>
                    Active
                  </div>
                )}
                {step.status === 'complete' && (
                  <div className="ml-2 flex items-center bg-green-900 bg-opacity-50 px-2 py-1 rounded-full text-xs text-green-300">
                    <span className="mr-1">✓</span>
                    Complete
                  </div>
                )}
              </div>
              
              <p className="text-gray-400 text-sm mt-1">
                {currentAgent === step.agent && currentMessage ? 
                  currentMessage : step.message}
              </p>
              
              {step.status === 'thinking' && currentAgent === step.agent && (
                <div className="w-full h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ 
                      width: `${Math.random() * 50 + 30}%`,
                      animation: 'pulse 1.5s infinite'
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ThinkingProcess;