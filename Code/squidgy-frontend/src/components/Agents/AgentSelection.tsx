// src/components/Agents/AgentSelection.tsx
import React from 'react';
import AgentCard from './AgentCard';

interface AgentSelectionProps {
  onSelectAgent: (agentId: string) => void;
}

const AgentSelection: React.FC<AgentSelectionProps> = ({ onSelectAgent }) => {
  // src/components/Agents/AgentSelection.tsx
  const availableAgents = [
    {
      id: 'presaleskb',
      name: 'Pre-Sales Consultant',
      avatar: '/avatars/presales-consultant.jpg',
      type: 'PreSalesConsultant',
      description: 'Provides technical expertise and solution demonstrations. Helps with pricing and implementation details.',
      fallbackAvatar: '/avatars/presales-fallback.jpg'
    },
    {
      id: 'socialmediakb',
      name: 'Social Media Manager',
      avatar: '/avatars/social-media-manager.jpg',
      type: 'SocialMediaManager',
      description: 'Creates and manages social media strategies. Specializes in content planning and engagement.',
      fallbackAvatar: '/avatars/social-fallback.jpg'
    },
    {
      id: 'leadgenkb',
      name: 'Lead Generation Specialist',
      avatar: '/avatars/lead-gen-specialist.jpg',
      type: 'LeadGenSpecialist',
      description: 'Focuses on generating and qualifying leads. Manages follow-ups and appointments.',
      fallbackAvatar: '/avatars/leadgen-fallback.jpg'
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