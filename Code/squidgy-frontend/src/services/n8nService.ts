// src/services/n8nService.ts
/**
 * Service for communicating with n8n workflows
 */

// Base URL for n8n webhook
const N8N_WEBHOOK_BASE = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';

/**
 * Process agent response via n8n
 * @param response - The response message
 * @param agentType - The type of agent (e.g., 'ProductManager')
 * @param sessionId - The current session/conversation ID
 */
export const processAgentResponse = async (
  response: string,
  agentType: string, 
  sessionId: string
) => {
  if (!N8N_WEBHOOK_BASE) {
    console.warn('N8N webhook URL not configured');
    return null;
  }
  
  try {
    const result = await fetch(N8N_WEBHOOK_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: response,
        agent: agentType,
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'agent_response'
      })
    });
    
    if (!result.ok) {
      throw new Error(`HTTP error! Status: ${result.status}`);
    }
    
    return await result.json();
  } catch (error) {
    console.error('Error sending to n8n workflow:', error);
    return null;
  }
};

/**
 * Send a message to n8n workflow
 * @param agent - The agent type (e.g., 'ProductManager')
 * @param message - The message content
 * @param sessionId - The current session/conversation ID
 * @param additionalData - Any additional data to include
 */
export const sendToN8nWorkflow = async (
  agent: string,
  message: string,
  sessionId: string,
  additionalData?: Record<string, any>
) => {
  if (!N8N_WEBHOOK_BASE) {
    console.warn('N8N webhook URL not configured');
    return null;
  }
  
  try {
    const result = await fetch(N8N_WEBHOOK_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent,
        message,
        sessionId,
        timestamp: new Date().toISOString(),
        ...additionalData
      })
    });
    
    if (!result.ok) {
      throw new Error(`HTTP error! Status: ${result.status}`);
    }
    
    return await result.json();
  } catch (error) {
    console.error('Error sending to n8n workflow:', error);
    return null;
  }
};

export default {
  processAgentResponse,
  sendToN8nWorkflow
};