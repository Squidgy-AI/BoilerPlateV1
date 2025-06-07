// src/components/Agents/AgentSelection.tsx
import React from 'react';
import AgentCard from './AgentCard';
import { AGENT_CONFIG } from '@/config/agents';

interface AgentSelectionProps {
  onSelectAgent: (agentId: string) => void;
}

const AgentSelection: React.FC<AgentSelectionProps> = ({ onSelectAgent }) => {
  // src/components/Agents/AgentSelection.tsx
  const availableAgents = AGENT_CONFIG;
  
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-white mb-6">Choose an Agent</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {availableAgents.map(agent => (
          <AgentCard 
            key={agent.id}
            id={agent.id}
            name={agent.name}
            avatar={agent.avatar}
            type={agent.type}
            description={agent.description}
            onClick={onSelectAgent}
          />
        ))}
      </div>
    </div>
  );
};

export default AgentSelection;