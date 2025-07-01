import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, avatarId } = req.body;

    if (!text || !avatarId) {
      return res.status(400).json({ error: 'Text and avatarId are required' });
    }

    // Get HeyGen API key from server-side environment (can access HEYGEN_API_KEY)
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'HeyGen API key not configured' });
    }

    console.log('🎥 Server: Generating video for avatar:', avatarId);

    // Create video generation request
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId,
            scale: 1.0,
          },
          voice: {
            type: 'text',
            input_text: text,
          },
        }],
        dimension: {
          width: 1280,
          height: 720,
        },
        aspect_ratio: '16:9',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HeyGen API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `HeyGen API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('✅ Video generation initiated:', data.data?.video_id);

    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Video generation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
