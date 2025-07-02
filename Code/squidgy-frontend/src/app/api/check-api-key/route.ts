// src/app/api/check-api-key/route.ts

export async function GET() {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    
    // Don't return the actual key for security, just check if it exists
    const keyStatus = apiKey ? 'API key is set' : 'API key is missing';
    const keyLength = apiKey ? apiKey.length : 0;
    
    return new Response(JSON.stringify({
      status: keyStatus,
      length: keyLength,
      firstFiveChars: apiKey ? apiKey.substring(0, 5) : '',
      lastFiveChars: apiKey ? apiKey.substring(apiKey.length - 5) : '',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to check API key' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
