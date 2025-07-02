import { NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { session_id, text, task_mode = 'sync', task_type = 'repeat' } = body;

    // Validate required fields
    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!HEYGEN_API_KEY) {
      console.error('❌ HEYGEN_API_KEY is not configured in environment variables');
      return NextResponse.json(
        { error: 'HeyGen API key not configured on server' },
        { status: 500 }
      );
    }

    console.log('🎯 Sending streaming task to HeyGen:', {
      sessionId: session_id.substring(0, 8) + '...',
      sessionIdLength: session_id.length,
      sessionIdFormat: /^[a-f0-9-]+$/i.test(session_id) ? 'valid UUID format' : 'invalid format',
      textLength: text.length,
      task_mode,
      task_type
    });

    // Send streaming task request to HeyGen API
    const response = await fetch(`${HEYGEN_API_URL}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        text,
        task_mode,
        task_type
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HeyGen streaming task failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        requestBody: {
          session_id: session_id.substring(0, 8) + '...',
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          task_mode,
          task_type
        },
        url: `${HEYGEN_API_URL}/v1/streaming.task`
      });
      
      // Try to parse error as JSON for more details
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
        console.error('❌ HeyGen API detailed error:', parsedError);
      } catch {
        console.error('❌ HeyGen API raw error text:', errorText);
      }
      
      return NextResponse.json(
        { 
          error: 'HeyGen streaming task failed',
          status: response.status,
          details: errorText,
          parsedError
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    console.log('✅ HeyGen streaming task successful:', {
      taskId: result.task_id,
      duration: result.duration_ms + 'ms'
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in HeyGen streaming task API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
