// src/components/Agents/AgentSelection.tsx
import React from 'react';
import AgentCard from './AgentCard';

interface AgentSelectionProps {
  onSelectAgent: (agentId: string) => void;
}

const AgentSelection: React.FC<AgentSelectionProps> = ({ onSelectAgent }) => {
  const availableAgents = [
    {
      id: 'agent1',
      name: 'Product Manager',
      avatar: '/seth.JPG',
      type: 'ProductManager',
      description: 'Helps coordinate the team and manage product development. Specializes in planning and strategy.'
    },
    {
      id: 'agent2',
      name: 'Pre-Sales Consultant',
      avatar: '/sol.jpg',
      type: 'PreSalesConsultant',
      description: 'Provides technical expertise and solution demonstrations. Helps with pricing and implementation details.'
    },
    {
      id: 'agent3',
      name: 'Social Media Manager',
      avatar: '/sarah.jpg',
      type: 'SocialMediaManager',
      description: 'Creates and manages social media strategies. Specializes in content planning and engagement.'
    },
    {
      id: 'agent4',
      name: 'Lead Gen Specialist',
      avatar: '/james.jpg',
      type: 'LeadGenSpecialist',
      description: 'Focuses on generating and qualifying leads. Manages follow-ups and appointments.'
    }
  ];
  
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