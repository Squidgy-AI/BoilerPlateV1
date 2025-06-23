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
    heygenAvatarId: 'Alessandra_ProfessionalLook_public', // Updated to HeyGen public avatar
    // heygenAvatarId: '413a244b053949f39e8ab50099a895ea', // Previous avatar ID
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
    heygenAvatarId: 'Anthony_ProfessionalLook_public', // Updated to HeyGen public avatar
    // heygenAvatarId: 'e0e84faea390465896db75a83be45085', // Previous avatar ID
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
    heygenAvatarId: 'Graham_ProfessionalLook_public', // Updated to HeyGen public avatar
    // heygenAvatarId: '4743944d7cbf40d0b6e5c3baf935ceff', // Previous avatar ID that was working
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
  const avatarId = agent?.heygenAvatarId || 'Alessandra_ProfessionalLook_public'; // Updated default to public avatar
  
  // Log the avatar ID being used for debugging
  console.log(`Getting HeyGen avatar ID for agent ${agentId}:`, avatarId);
  
  return avatarId;
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

// Helper function to validate avatar ID format
export const isValidAvatarId = (avatarId: string): boolean => {
  // HeyGen avatar IDs are typically 32-character hex strings
  const hexPattern = /^[a-f0-9]{32}$/i;
  return hexPattern.test(avatarId);
};

// Helper function to get a validated avatar ID with fallback
export const getValidatedAvatarId = (agentId: string): string => {
  const agent = getAgentById(agentId);
  const avatarId = agent?.heygenAvatarId;
  
  if (!avatarId) {
    console.warn(`No avatar ID found for agent ${agentId}, using default`);
    return 'Alessandra_ProfessionalLook_public';
  }
  
  // For public avatars, we accept the string format (not just hex)
  // Public avatars have names like "Alessandra_ProfessionalLook_public"
  if (avatarId.includes('_public') || isValidAvatarId(avatarId)) {
    console.log(`Using validated avatar ID for agent ${agentId}:`, avatarId);
    return avatarId;
  }
  
  console.warn(`Invalid avatar ID format for agent ${agentId}: ${avatarId}, using default`);
  return 'Alessandra_ProfessionalLook_public';
};