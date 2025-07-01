// src/services/heygenService.ts
/**
 * Service for communicating with HeyGen Streaming Avatar API
 * Handles text-to-speech tasks for Interactive Avatars
 */

// HeyGen API configuration - using server-side API route
const HEYGEN_STREAMING_TASK_API = '/api/heygen/streaming-task';

// Types for HeyGen Streaming Task API
export interface HeyGenStreamingTaskRequest {
  session_id: string;
  text: string;
  task_mode?: 'sync' | 'async';
  task_type?: 'repeat' | 'chat';
}

export interface HeyGenStreamingTaskResponse {
  duration_ms: number;
  task_id: string;
}

export interface HeyGenError {
  error: string;
  message?: string;
  code?: number;
}

/**
 * Send text to HeyGen Interactive Avatar for speech
 * @param sessionId - The ID of the avatar session
 * @param text - The text to be spoken by the avatar
 * @param taskMode - Whether the task is performed synchronously or not (default: sync)
 * @param taskType - Task type: repeat or chat (default: repeat)
 * @returns Promise with task response or error
 */
export const sendTextToAvatar = async (
  sessionId: string,
  text: string,
  taskMode: 'sync' | 'async' = 'sync',
  taskType: 'repeat' | 'chat' = 'repeat'
): Promise<HeyGenStreamingTaskResponse | null> => {
  if (!sessionId) {
    console.error('❌ Session ID is required');
    throw new Error('Session ID is required for HeyGen streaming task');
  }

  if (!text || text.trim().length === 0) {
    console.error('❌ Text is required');
    throw new Error('Text is required for HeyGen streaming task');
  }

  const requestBody: HeyGenStreamingTaskRequest = {
    session_id: sessionId,
    text: text.trim(),
    task_mode: taskMode,
    task_type: taskType
  };

  try {
    console.log('🎯 Sending streaming task via API route:', {
      sessionId: sessionId.substring(0, 8) + '...',
      textLength: text.length,
      taskMode,
      taskType
    });

    const response = await fetch(HEYGEN_STREAMING_TASK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ HeyGen streaming task failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`HeyGen API error: ${response.status} ${response.statusText}`);
    }

    const result: HeyGenStreamingTaskResponse = await response.json();
    
    console.log('✅ HeyGen streaming task successful:', {
      taskId: result.task_id,
      duration: result.duration_ms + 'ms'
    });

    return result;
  } catch (error) {
    console.error('❌ Error sending text to HeyGen avatar:', error);
    throw error;
  }
};

/**
 * Send text from n8n response to HeyGen avatar
 * This is a convenience function specifically for n8n integration
 * @param sessionId - The avatar session ID
 * @param n8nResponse - The response text from n8n workflow
 * @param agentType - The type of agent for logging purposes
 * @returns Promise with task response or null on error
 */
export const sendN8nResponseToAvatar = async (
  sessionId: string,
  n8nResponse: string,
  agentType?: string
): Promise<HeyGenStreamingTaskResponse | null> => {
  try {
    console.log('🔄 Processing n8n response for avatar speech:', {
      agentType,
      sessionId: sessionId.substring(0, 8) + '...',
      responseLength: n8nResponse.length
    });

    // Use 'chat' task type for n8n responses as they are conversational
    const result = await sendTextToAvatar(sessionId, n8nResponse, 'sync', 'chat');
    
    console.log('✅ n8n response sent to avatar successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send n8n response to avatar:', error);
    // Return null instead of throwing to allow graceful fallback
    return null;
  }
};

/**
 * Validate HeyGen session ID format
 * @param sessionId - The session ID to validate
 * @returns boolean indicating if session ID is valid
 */
export const validateSessionId = (sessionId: string): boolean => {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Basic validation - session IDs are typically UUIDs or similar
  const sessionIdPattern = /^[a-zA-Z0-9\-_]{8,}$/;
  return sessionIdPattern.test(sessionId);
};

/**
 * Get HeyGen configuration status
 * @returns Configuration object with API route status
 */
export const getHeyGenConfig = () => {
  return {
    apiKeyConfigured: true, // Server-side API key is configured via environment
    apiBaseUrl: HEYGEN_STREAMING_TASK_API,
    apiKeyPreview: 'Server-side configured'
  };
};

export default {
  sendTextToAvatar,
  sendN8nResponseToAvatar,
  validateSessionId,
  getHeyGenConfig
};
