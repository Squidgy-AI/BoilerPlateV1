// src/services/agentService.ts
// Service for managing agents from squidgy_agent_business_setup table

import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

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
    avatar: '/avatars/personal-assistant.jpg',
    description: 'Your general-purpose AI assistant'
  },
  {
    id: 'SOLAgent',
    name: 'Solar Sales Specialist',
    avatar: '/avatars/sol-agent.jpg',
    description: 'Specialized in solar energy sales and calculations'
  }
];

/**
 * Get all agents for the current user from database
 */
export const getUserAgents = async (): Promise<Agent[]> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return [];
    }

    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*')
      .eq('firm_user_id', userIdResult.user_id)
      .order('agent_id');

    if (error) {
      console.error('Error fetching user agents:', error);
      return [];
    }

    // Map database records to Agent interface
    const agents: Agent[] = (data || []).map(record => {
      const defaultAgent = DEFAULT_AGENTS.find(a => a.id === record.agent_id);
      return {
        id: record.agent_id,
        name: record.agent_name,
        avatar: defaultAgent?.avatar || '/avatars/default.jpg',
        description: defaultAgent?.description || 'AI Assistant',
        enabled: record.is_enabled,
        setup_json: record.setup_json,
        created_at: record.created_at,
        updated_at: record.updated_at
      };
    });

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
 * Enable/disable an agent for the current user
 */
export const updateAgentEnabledStatus = async (agentId: string, enabled: boolean): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    // First try to update existing record
    const { data: updateData, error: updateError } = await supabase
      .from('squidgy_agent_business_setup')
      .update({ 
        is_enabled: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('firm_user_id', userIdResult.user_id)
      .eq('agent_id', agentId)
      .select();

    if (updateError) {
      console.error('Error updating agent status:', updateError);
      return false;
    }

    // If no rows were updated, insert new record
    if (!updateData || updateData.length === 0) {
      const defaultAgent = DEFAULT_AGENTS.find(a => a.id === agentId);
      const { error: insertError } = await supabase
        .from('squidgy_agent_business_setup')
        .insert({
          firm_user_id: userIdResult.user_id,
          agent_id: agentId,
          agent_name: defaultAgent?.name || agentId,
          is_enabled: enabled,
          setup_json: {}
        });

      if (insertError) {
        console.error('Error inserting agent record:', insertError);
        return false;
      }
    }

    console.log(`✅ Agent ${agentId} ${enabled ? 'enabled' : 'disabled'} successfully`);
    return true;
  } catch (error) {
    console.error('Error in updateAgentEnabledStatus:', error);
    return false;
  }
};

/**
 * Update agent setup configuration
 */
export const updateAgentSetup = async (agentId: string, setupData: any): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    const { error } = await supabase
      .from('squidgy_agent_business_setup')
      .update({ 
        setup_json: setupData,
        updated_at: new Date().toISOString()
      })
      .eq('firm_user_id', userIdResult.user_id)
      .eq('agent_id', agentId);

    if (error) {
      console.error('Error updating agent setup:', error);
      return false;
    }

    console.log(`✅ Agent ${agentId} setup updated successfully`);
    return true;
  } catch (error) {
    console.error('Error in updateAgentSetup:', error);
    return false;
  }
};

/**
 * Get specific agent setup configuration
 */
export const getAgentSetup = async (agentId: string): Promise<any> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return null;
    }

    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .select('setup_json')
      .eq('firm_user_id', userIdResult.user_id)
      .eq('agent_id', agentId)
      .single();

    if (error) {
      console.error('Error fetching agent setup:', error);
      return null;
    }

    return data?.setup_json || {};
  } catch (error) {
    console.error('Error in getAgentSetup:', error);
    return null;
  }
};

/**
 * Initialize default agents for a new user
 */
export const initializeUserAgents = async (): Promise<boolean> => {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('Failed to get user ID:', userIdResult.error);
      return false;
    }

    // Insert default agents if they don't exist
    for (const defaultAgent of DEFAULT_AGENTS) {
      await supabase
        .from('squidgy_agent_business_setup')
        .insert({
          firm_user_id: userIdResult.user_id,
          agent_id: defaultAgent.id,
          agent_name: defaultAgent.name,
          is_enabled: defaultAgent.id === 'PersonalAssistant', // Only PersonalAssistant enabled by default
          setup_json: {}
        })
        .select()
        .single()
        .then(({ error }) => {
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error(`Error inserting agent ${defaultAgent.id}:`, error);
          }
        });
    }

    console.log('✅ User agents initialized successfully');
    return true;
  } catch (error) {
    console.error('Error in initializeUserAgents:', error);
    return false;
  }
};