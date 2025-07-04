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
 * Enable/disable a specific setup type for an agent via backend API
 */
export const updateAgentEnabledStatus = async (agentId: string, setupType: string, enabled: boolean): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    console.log(`🔄 Updating agent ${agentId} ${setupType} status to ${enabled ? 'enabled' : 'disabled'}`);

    // Update via backend API
    const result = await updateAgentStatusViaBackend({
      user_id: userIdResult.user_id,
      agent_id: agentId,
      setup_type: setupType,
      is_enabled: enabled
    });

    if (result) {
      console.log(`✅ Agent ${agentId} ${setupType} ${enabled ? 'enabled' : 'disabled'} successfully`);
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
export const updateAgentSetup = async (agentId: string, setupType: string, setupData: any, sessionId?: string): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    console.log(`🔄 Updating agent ${agentId} ${setupType} configuration`);

    // Get the agent name from defaults
    const defaultAgent = DEFAULT_AGENTS.find(a => a.id === agentId);
    const agentName = defaultAgent?.name || agentId;

    // Update via backend API
    const result = await createOrUpdateAgentSetup({
      user_id: userIdResult.user_id,
      agent_id: agentId,
      agent_name: agentName,
      setup_data: setupData,
      setup_type: setupType,
      session_id: sessionId,
      is_enabled: true  // Enable setup when completed
    });

    if (result) {
      console.log(`✅ Agent ${agentId} ${setupType} setup updated successfully`);
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
export const getAgentSetup = async (agentId: string, setupType?: string): Promise<any> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return null;
    }

    console.log(`🔍 Getting agent ${agentId} ${setupType || 'all'} setup configuration`);

    // Get from backend API
    const agent = await getAgentSetupFromBackend(userIdResult.user_id, agentId, setupType);

    if (agent) {
      console.log(`✅ Retrieved agent ${agentId} ${setupType || 'all'} setup:`, agent.setup_json);
      return agent.setup_json || {};
    } else {
      console.log(`ℹ️ No ${setupType || ''} setup found for agent ${agentId}`);
      return {};
    }
  } catch (error) {
    console.error('Error in getAgentSetup:', error);
    return null;
  }
};

/**
 * Initialize PersonalAssistant for a user (always available)
 */
export const initializePersonalAssistant = async (): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    console.log('🔄 Initializing PersonalAssistant for user:', userIdResult.user_id);

    // Check if PersonalAssistant already exists
    const existingAgent = await getAgentSetupFromBackend(userIdResult.user_id, 'PersonalAssistant', 'agent_config');
    
    if (existingAgent) {
      console.log('ℹ️ PersonalAssistant already exists - SKIPPING');
      return true;
    }
    
    // Create PersonalAssistant
    const result = await createOrUpdateAgentSetup({
      user_id: userIdResult.user_id,
      agent_id: 'PersonalAssistant',
      agent_name: 'Personal Assistant Bot',
      setup_data: {
        description: 'Your general-purpose AI assistant',
        capabilities: ['general_chat', 'help', 'information']
      },
      setup_type: 'agent_config', // Use agent_config for PersonalAssistant
      is_enabled: true
    });
    
    if (result) {
      console.log('✅ PersonalAssistant initialized successfully');
      return true;
    } else {
      console.error('❌ Failed to initialize PersonalAssistant');
      return false;
    }
  } catch (error) {
    console.error('Error initializing PersonalAssistant:', error);
    return false;
  }
};

/**
 * Check if user has completed progressive setup for an agent
 */
export const checkAgentSetupProgress = async (agentId: string): Promise<{
  solar_completed: boolean;
  calendar_completed: boolean; 
  notifications_completed: boolean;
}> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return { solar_completed: false, calendar_completed: false, notifications_completed: false };
    }

    // Check each setup type
    const [solarSetup, calendarSetup, notificationSetup] = await Promise.all([
      getAgentSetupFromBackend(userIdResult.user_id, agentId, 'SolarSetup'),
      getAgentSetupFromBackend(userIdResult.user_id, agentId, 'CalendarSetup'), 
      getAgentSetupFromBackend(userIdResult.user_id, agentId, 'NotificationSetup')
    ]);

    return {
      solar_completed: !!solarSetup,
      calendar_completed: !!calendarSetup,
      notifications_completed: !!notificationSetup
    };
  } catch (error) {
    console.error('Error checking agent setup progress:', error);
    return { solar_completed: false, calendar_completed: false, notifications_completed: false };
  }
};