import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { video_id } = req.query;

    if (!video_id || typeof video_id !== 'string') {
      return res.status(400).json({ error: 'video_id is required' });
    }

    // Get HeyGen API key from server-side environment
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'HeyGen API key not configured' });
    }

    console.log('🔍 Server: Polling video status for:', video_id);

    // Poll video status
    const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HeyGen polling error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `HeyGen API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('📊 Video status:', data.data?.status);

    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Video polling error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
