import React from 'react';
import { getAgentById, getAgentGreeting } from '../config/agents';

interface AgentGreetingProps {
  agentId: string;
  className?: string;
}

export const AgentGreeting: React.FC<AgentGreetingProps> = ({ 
  agentId, 
  className = "" 
}) => {
  const agent = getAgentById(agentId);
  const greeting = getAgentGreeting(agentId);
  
  if (!agent) return null;

  return (
    <div className={`flex items-start space-x-3 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100 ${className}`}>
      <img 
        src={agent.avatar} 
        alt={agent.name}
        className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-blue-200"
        onError={(e) => {
          e.currentTarget.src = agent.fallbackAvatar;
        }}
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-semibold text-blue-700">{agent.name}</span>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            AI Assistant
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">{greeting}</p>
      </div>
    </div>
  );
};

export default AgentGreeting;