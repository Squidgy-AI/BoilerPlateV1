// src/config/agents.ts

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  type: string;
  description: string;
  heygenAvatarId: string;
  fallbackAvatar: string;
  agent_name: string;
  introMessage: string;  // New field for intro message
}

export const AGENT_CONFIG: Agent[] = [
  {
    id: 'presaleskb',
    name: 'Pre-Sales Consultant',
    avatar: '/avatars/presales-consultant.jpg',
    type: 'PreSalesConsultant',
    description: 'Provides technical expertise and solution demonstrations',
    heygenAvatarId: '413a244b053949f39e8ab50099a895ea',
    fallbackAvatar: '/avatars/presales-fallback.jpg',
    agent_name: 'presaleskb',
    introMessage: "Hi! I'm your Pre-Sales Consultant. I help analyze businesses and provide tailored solutions including ROI analysis and technical implementation details."
  },
  {
    id: 'socialmediakb',
    name: 'Social Media Manager',
    avatar: '/avatars/social-media-manager.jpg',
    type: 'SocialMediaManager',
    description: 'Creates and manages social media strategies',
    heygenAvatarId: 'e0e84faea390465896db75a83be45085',
    fallbackAvatar: '/avatars/social-fallback.jpg',
    agent_name: 'socialmediakb',
    introMessage: "Hello! I'm your Social Media Manager. I specialize in digital presence strategies, content marketing, and social media automation across all major platforms."
  },
  {
    id: 'leadgenkb',
    name: 'Lead Generation Specialist',
    avatar: '/avatars/lead-gen-specialist.jpg',
    type: 'LeadGenSpecialist',
    description: 'Focuses on generating and qualifying leads',
    heygenAvatarId: '1732660983',
    fallbackAvatar: '/avatars/leadgen-fallback.jpg',
    agent_name: 'leadgenkb',
    introMessage: "Hi there! I'm your Lead Generation Specialist. I help schedule demos, coordinate follow-ups, and ensure all your business needs are properly addressed."
  }
];

// Helper functions (keep existing ones)
export const getAgentById = (id: string): Agent | undefined => {
  return AGENT_CONFIG.find(agent => agent.id === id);
};

export const getAgentByHeygenId = (heygenId: string): Agent | undefined => {
  return AGENT_CONFIG.find(agent => agent.heygenAvatarId === heygenId);
};

export const getHeygenAvatarId = (agentId: string): string => {
  const agent = getAgentById(agentId);
  return agent?.heygenAvatarId || 'Anna_public_3_20240108'; // Default
};

export const getFallbackAvatar = (agentIdOrHeygenId: string): string => {
  const agentById = getAgentById(agentIdOrHeygenId);
  if (agentById) return agentById.fallbackAvatar;
  
  const agentByHeygenId = getAgentByHeygenId(agentIdOrHeygenId);
  if (agentByHeygenId) return agentByHeygenId.fallbackAvatar;
  
  return '/avatars/default-agent.jpg'; // Default fallback
};

// New helper function to get agent_name for n8n
export const getAgentName = (agentId: string): string => {
  const agent = getAgentById(agentId);
  return agent?.agent_name || 'presaleskb'; // Default
};

// Helper function to get agent greeting message
export const getAgentGreeting = (agentId: string): string => {
  const agent = getAgentById(agentId);
  return agent?.introMessage || `Hello! I'm your ${agentId} assistant. How can I help you today?`;
};