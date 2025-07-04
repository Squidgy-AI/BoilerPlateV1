// src/services/backendApiService.ts
// Service for making API calls to the Python backend

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

console.log('🔧 Backend API Service configured with URL:', BACKEND_URL);

export interface BackendAgent {
  firm_user_id: string;
  agent_id: string;
  agent_name: string;
  setup_json: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentSetupRequest {
  user_id: string;
  agent_id: string;
  agent_name: string;
  setup_data: any;
  is_enabled?: boolean;
  setup_type?: string;  // Optional: defaults to 'agent_config' for PersonalAssistant
  session_id?: string;
}

export interface AgentStatusRequest {
  user_id: string;
  agent_id: string;
  is_enabled: boolean;
  setup_type?: string;  // Optional: defaults to 'agent_config' for PersonalAssistant
}

/**
 * Get all agent setups for a user from backend
 */
export const getUserAgentsFromBackend = async (userId: string): Promise<BackendAgent[]> => {
  try {
    console.log('🔍 Getting user agents from backend for user:', userId);
    
    const response = await fetch(`${BACKEND_URL}/api/agents/setup/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Backend response:', result);

    if (result.status === 'success') {
      return result.agents || [];
    } else {
      throw new Error(result.message || 'Unknown error from backend');
    }
  } catch (error) {
    console.error('❌ Error getting user agents from backend:', error);
    throw error;
  }
};

/**
 * Get specific agent setup for a user from backend
 */
export const getAgentSetupFromBackend = async (userId: string, agentId: string, setupType?: string): Promise<BackendAgent | null> => {
  try {
    console.log('🔍 Getting agent setup from backend:', { userId, agentId, setupType });
    
    let url = `${BACKEND_URL}/api/agents/setup/${userId}/${agentId}`;
    if (setupType) {
      url += `?setup_type=${encodeURIComponent(setupType)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Backend agent setup response:', result);

    if (result.status === 'success' && result.exists) {
      return result.agent;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting agent setup from backend:', error);
    return null;
  }
};

/**
 * Create or update agent setup via backend
 */
export const createOrUpdateAgentSetup = async (request: AgentSetupRequest): Promise<BackendAgent | null> => {
  try {
    console.log('🔄 Creating/updating agent setup via backend:', request);
    
    const response = await fetch(`${BACKEND_URL}/api/agents/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Backend setup response:', result);

    if (result.status === 'success') {
      return result.agent;
    } else {
      throw new Error(result.message || 'Unknown error from backend');
    }
  } catch (error) {
    console.error('❌ Error creating/updating agent setup:', error);
    throw error;
  }
};

/**
 * Update agent enabled/disabled status via backend
 */
export const updateAgentStatusViaBackend = async (request: AgentStatusRequest): Promise<BackendAgent | null> => {
  try {
    console.log('🔄 Updating agent status via backend:', request);
    
    const response = await fetch(`${BACKEND_URL}/api/agents/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Backend status update response:', result);

    if (result.status === 'success') {
      return result.agent;
    } else {
      throw new Error(result.message || 'Unknown error from backend');
    }
  } catch (error) {
    console.error('❌ Error updating agent status:', error);
    throw error;
  }
};

/**
 * Delete agent setup via backend
 */
export const deleteAgentSetupViaBackend = async (userId: string, agentId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting agent setup via backend:', { userId, agentId });
    
    const response = await fetch(`${BACKEND_URL}/api/agents/setup/${userId}/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Backend delete response:', result);

    return result.status === 'success' && result.deleted;
  } catch (error) {
    console.error('❌ Error deleting agent setup:', error);
    throw error;
  }
};