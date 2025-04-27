// src/services/n8nService.ts
const N8N_ENDPOINT = process.env.NEXT_PUBLIC_N8N_ENDPOINT || 'https://n8n.yourdomain.com/webhook/';

export const sendMessageToN8n = async (agent: string, message: string, sessionId: string) => {
  try {
    const response = await fetch(N8N_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent,
        message,
        sessionId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`N8N API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message to n8n:', error);
    throw error;
  }
};

export const processAgentResponse = async (message: string, agentType: string, sessionId: string) => {
  // Send the response to n8n workflow
  try {
    await sendMessageToN8n(agentType, message, sessionId);
    return true;
  } catch (error) {
    console.error('Error processing agent response:', error);
    return false;
  }
};