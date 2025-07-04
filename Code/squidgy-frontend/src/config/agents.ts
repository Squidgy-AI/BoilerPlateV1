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
  is_enabled: boolean;
}

export const AGENT_CONFIG: Agent[] = [
  {
    id: 'PersonalAssistant',
    name: 'Personal Assistant Bot',
    avatar: '/avatars/personal-assistant.jpg',
    type: 'PersonalAssistant',
    description: 'Your intelligent personal assistant for all needs',
    // heygenAvatarId: '413a244b053949f39e8ab50099a895ea', // Original avatar ID - NOT FOUND ERROR
    // heygenAvatarId: 'Wayne_20240711', // May not be available
    heygenAvatarId: 'josh_lite3_20230714', // HeyGen's default public avatar
    fallbackAvatar: '/avatars/personal-assistant-fallback.jpg',
    agent_name: 'PersonalAssistant',
    introMessage: "Hi! I'm your Personal Assistant Bot. I help with various tasks, answer questions, and provide assistance with anything you need.",
    is_enabled: true
  },
  {
    id: 'SOLAgent',
    name: 'Solar Sales Specialist',
    avatar: '/avatars/lead-gen-specialist.jpg', // Using existing professional avatar temporarily
    type: 'SOLAgent',
    description: 'Expert in solar energy solutions and renewable energy sales',
    // heygenAvatarId: 'Thaddeus_ProfessionalLook_public', // May not be working
    heygenAvatarId: 'anna_public_3_20240108', // HeyGen's public avatar for solar specialist
    fallbackAvatar: '/avatars/leadgen-fallback.jpg', // Using existing fallback
    agent_name: 'SOLAgent',
    introMessage: "Hello! I'm your Solar Sales Specialist. I help customers find the perfect solar energy solutions, calculate savings, and guide them through the transition to renewable energy. How can I help you go solar today?",
    is_enabled: true  // This should match database - but database is the source of truth
  }
  // Commenting out Social Media Manager and Lead Generation Specialist as requested
  /*
  {
    id: 'leadgenkb',
    name: 'Lead Generation Specialist',
    avatar: '/avatars/lead-gen-specialist.jpg',
    type: 'LeadGenSpecialist',
    description: 'Focuses on generating and qualifying leads',
    // heygenAvatarId: 'Pedro_ProfessionalLook_public', // May not be working
    heygenAvatarId: 'matt_public_2_20240108', // HeyGen's public avatar
    fallbackAvatar: '/avatars/leadgen-fallback.jpg',
    agent_name: 'leadgenkb',
    introMessage: "Hi there! I'm your Lead Generation Specialist. I help schedule demos, coordinate follow-ups, and ensure all your business needs are properly addressed."
  }
  */
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
  const avatarId = agent?.heygenAvatarId || 'Thaddeus_ProfessionalLook_public'; // Default public avatar
  
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
  return agent?.agent_name || 'PersonalAssistant'; // Default
};

// Helper function to get agent greeting message
export const getAgentGreeting = (agentId: string): string => {
  const agent = getAgentById(agentId);
  return agent?.introMessage || `Hello! I'm your ${agentId} assistant. How can I help you today?`;
};

// Helper function to validate avatar ID format
export const isValidAvatarId = (avatarId: string): boolean => {
  // HeyGen avatar IDs can be:
  // 1. 32-character hex strings (e.g., "413a244b053949f39e8ab50099a895ea")
  // 2. Named avatars with dates (e.g., "Wayne_20240711")
  // 3. Public avatars (e.g., "Thaddeus_ProfessionalLook_public")
  // 4. Public avatars with version/date (e.g., "josh_lite3_20230714", "anna_public_3_20240108")
  const hexPattern = /^[a-f0-9]{32}$/i;
  const namedPattern = /^[A-Za-z]+_\d{8}$/; // Name_YYYYMMDD format
  const publicPattern = /_public/; // Contains _public anywhere
  const versionedPattern = /^[a-z]+_[a-z0-9_]+_\d{8}$/i; // name_version_date format
  
  return hexPattern.test(avatarId) || 
         namedPattern.test(avatarId) || 
         publicPattern.test(avatarId) || 
         versionedPattern.test(avatarId);
};

// Helper function to get a validated avatar ID with fallback
export const getValidatedAvatarId = (agentId: string): string => {
  const agent = getAgentById(agentId);
  const avatarId = agent?.heygenAvatarId;
  
  if (!avatarId) {
    console.warn(`No avatar ID found for agent ${agentId}, using default`);
    return 'Thaddeus_ProfessionalLook_public';
  }
  
  // Check if it's a valid avatar ID format
  if (isValidAvatarId(avatarId)) {
    console.log(`Using validated avatar ID for agent ${agentId}: ${avatarId}`);
    return avatarId;
  }
  
  console.warn(`Invalid avatar ID format for agent ${agentId}: ${avatarId}, using default`);
  return 'Thaddeus_ProfessionalLook_public';
};

// DEPRECATED: Use database-driven agent management from /services/agentService.ts instead
// These functions are commented out to prevent conflicts with the database system

/*
// Helper function to get only enabled agents
export const getEnabledAgents = (): Agent[] => {
  return AGENT_CONFIG.filter(agent => agent.is_enabled);
};

// Helper function to update agent enabled status
export const updateAgentEnabledStatus = (agentId: string, enabled: boolean): boolean => {
  const agent = AGENT_CONFIG.find(a => a.id === agentId);
  if (agent) {
    agent.is_enabled = enabled;
    // Store in localStorage for persistence
    localStorage.setItem(`agent_${agentId}_enabled`, enabled.toString());
    console.log(`Updated agent ${agentId} enabled status to: ${enabled}`);
    
    // Dispatch custom event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agentUpdated', { 
        detail: { agentId, enabled } 
      }));
    }
    
    return true;
  }
  return false;
};

// Helper function to restore agent enabled status from localStorage
export const restoreAgentEnabledStatus = (): void => {
  AGENT_CONFIG.forEach(agent => {
    const savedStatus = localStorage.getItem(`agent_${agent.id}_enabled`);
    if (savedStatus !== null) {
      agent.is_enabled = savedStatus === 'true';
      console.log(`Restored agent ${agent.id} enabled status: ${agent.is_enabled}`);
    }
  });
};
*/

// Helper function to force disable an agent and clear localStorage
export const forceDisableAgent = (agentId: string): boolean => {
  const agent = AGENT_CONFIG.find(a => a.id === agentId);
  if (agent) {
    agent.is_enabled = false;
    // Clear localStorage for this agent
    localStorage.removeItem(`agent_${agentId}_enabled`);
    console.log(`Force disabled agent ${agentId} and cleared localStorage`);
    
    // Dispatch custom event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agentUpdated', { 
        detail: { agentId, enabled: false } 
      }));
    }
    
    return true;
  }
  return false;
};