// src/services/agentService.ts
// Service for managing agents via backend API

import { getUserId } from '@/utils/getUserId';
import { 
  getUserAgentsFromBackend, 
  getAgentSetupFromBackend, 
  createOrUpdateAgentSetup, 
  updateAgentStatusViaBackend,
  deleteAgentSetupViaBackend,
  type BackendAgent 
} from './backendApiService';

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  enabled: boolean;
  setup_json?: any;
  created_at?: string;
  updated_at?: string;
}

// Default agent configurations
const DEFAULT_AGENTS = [
  {
    id: 'PersonalAssistant',
    name: 'Personal Assistant Bot',
    avatar: 'Bot',
    description: 'Your general-purpose AI assistant'
  },
  {
    id: 'SOLAgent',
    name: 'Solar Sales Specialist',
    avatar: 'Sun',
    description: 'Specialized in solar energy sales and calculations'
  }
];

/**
 * Get all agents for the current user via backend API
 */
export const getUserAgents = async (): Promise<Agent[]> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return [];
    }

    console.log('🔍 getUserAgents: Fetching from backend for user:', userIdResult.user_id);

    // Get agents from backend API
    const backendAgents = await getUserAgentsFromBackend(userIdResult.user_id);

    // Map backend records to Agent interface
    const agents: Agent[] = backendAgents.map((record: BackendAgent) => {
      const defaultAgent = DEFAULT_AGENTS.find(a => a.id === record.agent_id);
      return {
        id: record.agent_id,
        name: record.agent_name,
        avatar: defaultAgent?.avatar || 'Bot',
        description: defaultAgent?.description || 'AI Assistant',
        enabled: record.is_enabled,
        setup_json: record.setup_json,
        created_at: record.created_at,
        updated_at: record.updated_at
      };
    });

    console.log('✅ Successfully mapped agents:', agents.length);
    return agents;
  } catch (error) {
    console.error('Error in getUserAgents:', error);
    return [];
  }
};

/**
 * Get only enabled agents for the current user
 */
export const getEnabledAgents = async (): Promise<Agent[]> => {
  const allAgents = await getUserAgents();
  return allAgents.filter(agent => agent.enabled);
};

/**
 * Enable/disable an agent for the current user via backend API
 */
export const updateAgentEnabledStatus = async (agentId: string, enabled: boolean): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    console.log(`🔄 Updating agent ${agentId} status to ${enabled ? 'enabled' : 'disabled'}`);

    // Update via backend API
    const result = await updateAgentStatusViaBackend({
      user_id: userIdResult.user_id,
      agent_id: agentId,
      is_enabled: enabled
    });

    if (result) {
      console.log(`✅ Agent ${agentId} ${enabled ? 'enabled' : 'disabled'} successfully`);
      return true;
    } else {
      console.error('❌ Failed to update agent status');
      return false;
    }
  } catch (error) {
    console.error('Error in updateAgentEnabledStatus:', error);
    return false;
  }
};

/**
 * Update agent setup configuration via backend API
 */
export const updateAgentSetup = async (agentId: string, setupData: any): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    console.log(`🔄 Updating agent ${agentId} setup configuration`);

    // Get the agent name from defaults
    const defaultAgent = DEFAULT_AGENTS.find(a => a.id === agentId);
    const agentName = defaultAgent?.name || agentId;

    // Update via backend API
    const result = await createOrUpdateAgentSetup({
      user_id: userIdResult.user_id,
      agent_id: agentId,
      agent_name: agentName,
      setup_data: setupData,
      is_enabled: true  // Enable agent when setup is completed
    });

    if (result) {
      console.log(`✅ Agent ${agentId} setup updated successfully`);
      return true;
    } else {
      console.error('❌ Failed to update agent setup');
      return false;
    }
  } catch (error) {
    console.error('Error in updateAgentSetup:', error);
    return false;
  }
};

/**
 * Get specific agent setup configuration via backend API
 */
export const getAgentSetup = async (agentId: string): Promise<any> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return null;
    }

    console.log(`🔍 Getting agent ${agentId} setup configuration`);

    // Get from backend API
    const agent = await getAgentSetupFromBackend(userIdResult.user_id, agentId);

    if (agent) {
      console.log(`✅ Retrieved agent ${agentId} setup:`, agent.setup_json);
      return agent.setup_json || {};
    } else {
      console.log(`ℹ️ No setup found for agent ${agentId}`);
      return {};
    }
  } catch (error) {
    console.error('Error in getAgentSetup:', error);
    return null;
  }
};

/**
 * Initialize default agents for a new user via backend API
 */
export const initializeUserAgents = async (): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    console.log('🔄 Initializing default agents for user:', userIdResult.user_id);

    // Initialize default agents via backend API - ONLY if they don't exist
    for (const defaultAgent of DEFAULT_AGENTS) {
      try {
        // First check if agent already exists
        const existingAgent = await getAgentSetupFromBackend(userIdResult.user_id, defaultAgent.id);
        
        if (existingAgent) {
          console.log(`ℹ️ Agent ${defaultAgent.id} already exists - SKIPPING to preserve user settings`);
          continue; // Skip if agent exists - don't overwrite user's enabled status!
        }
        
        // Only create if it doesn't exist
        await createOrUpdateAgentSetup({
          user_id: userIdResult.user_id,
          agent_id: defaultAgent.id,
          agent_name: defaultAgent.name,
          setup_data: {},
          is_enabled: defaultAgent.id === 'PersonalAssistant' // Only PersonalAssistant enabled by default
        });
        
        console.log(`✅ Created new agent ${defaultAgent.id}`);
      } catch (error) {
        console.log(`ℹ️ Error with agent ${defaultAgent.id}:`, error);
      }
    }

    console.log('✅ User agents initialized successfully');
    return true;
  } catch (error) {
    console.error('Error in initializeUserAgents:', error);
    return false;
  }
};