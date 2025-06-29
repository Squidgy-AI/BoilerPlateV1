// src/utils/agentSetupDb.ts
import { SolarBusinessConfig } from '@/config/solarBusinessConfig';

interface SaveAgentSetupParams {
  agent_id: string;
  agent_name: string;
  setup_json: any;
  firm_id?: string;
}

interface AgentSetupResponse {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
  details?: string;
}

/**
 * Save agent business setup to database
 */
export const saveAgentSetupToDb = async (params: SaveAgentSetupParams): Promise<AgentSetupResponse> => {
  try {
    const response = await fetch('/api/save-agent-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to save agent setup:', result);
      return {
        success: false,
        message: result.error || 'Failed to save configuration',
        error: result.error,
        details: result.details
      };
    }

    return result;
  } catch (error) {
    console.error('Error saving agent setup:', error);
    return {
      success: false,
      message: 'Network error while saving configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retrieve agent business setup from database
 */
export const getAgentSetupFromDb = async (agent_id: string): Promise<AgentSetupResponse> => {
  try {
    const response = await fetch(`/api/save-agent-setup?agent_id=${agent_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to retrieve agent setup:', result);
      return {
        success: false,
        message: result.error || 'Failed to retrieve configuration',
        error: result.error,
        details: result.details
      };
    }

    return result;
  } catch (error) {
    console.error('Error retrieving agent setup:', error);
    return {
      success: false,
      message: 'Network error while retrieving configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Save Solar Business Config specifically
 */
export const saveSolarConfigToDb = async (config: SolarBusinessConfig): Promise<AgentSetupResponse> => {
  return saveAgentSetupToDb({
    agent_id: 'SOLAgent',
    agent_name: 'Solar Sales Specialist',
    setup_json: config
  });
};

/**
 * Get Solar Business Config from database
 */
export const getSolarConfigFromDb = async (): Promise<SolarBusinessConfig | null> => {
  const response = await getAgentSetupFromDb('SOLAgent');
  
  if (response.success && response.data?.setup_json) {
    return response.data.setup_json as SolarBusinessConfig;
  }
  
  return null;
};