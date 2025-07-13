// src/utils/n8nIntegration.ts
/**
 * Utility for communicating with n8n workflows
 */

// Base URL for n8n webhook
const N8N_WEBHOOK_BASE = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';

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
    console.error('N8N webhook URL not configured');
    return { success: false, error: 'N8N webhook URL not configured' };
  }
  
  try {
    const response = await fetch(N8N_WEBHOOK_BASE, {
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
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending to n8n workflow:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Process agent response via n8n
 * @param agentType - The type of agent
 * @param response - The response message
 * @param sessionId - The session ID
 */
export const processAgentResponse = async (
  agentType: string, 
  response: string, 
  sessionId: string
) => {
  return sendToN8nWorkflow(agentType, response, sessionId, {
    responseType: 'agentResponse'
  });
};