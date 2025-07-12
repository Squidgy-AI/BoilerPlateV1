import { NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { avatarId } = body;

    if (!avatarId) {
      return NextResponse.json(
        { error: 'Avatar ID is required' },
        { status: 400 }
      );
    }

    if (!HEYGEN_API_KEY) {
      return NextResponse.json(
        { error: 'HEYGEN_API_KEY is not configured in environment variables' },
        { status: 500 }
      );
    }

    console.log(`Testing HeyGen avatar with ID: ${avatarId}`);

    // First, get a streaming token
    const tokenResponse = await fetch(
      `${HEYGEN_API_URL}/v1/streaming.create_token`,
      {
        method: 'POST',
        headers: {
          'x-api-key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokenResponse.ok) {
      const tokenErrorText = await tokenResponse.text();
      console.error('Failed to get streaming token:', tokenErrorText);
      return NextResponse.json(
        { 
          error: 'Failed to get streaming token',
          status: tokenResponse.status,
          details: tokenErrorText
        },
        { status: tokenResponse.status }
      );
    }

    const tokenText = await tokenResponse.text();
    console.log('Successfully obtained streaming token');

    // Now check if the avatar exists by making a request to the avatar API
    const avatarCheckResponse = await fetch(
      `${HEYGEN_API_URL}/v1/avatar.list`,
      {
        method: 'GET',
        headers: {
          'x-api-key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!avatarCheckResponse.ok) {
      const avatarErrorText = await avatarCheckResponse.text();
      console.error('Failed to check avatar list:', avatarErrorText);
      return NextResponse.json(
        { 
          error: 'Failed to check avatar list',
          status: avatarCheckResponse.status,
          details: avatarErrorText,
          token: tokenText.substring(0, 10) + '...' // Only return part of the token for security
        },
        { status: avatarCheckResponse.status }
      );
    }

    const avatarListData = await avatarCheckResponse.json();

    // Check if the requested avatar ID exists in the list
    const avatarExists = avatarListData.data?.some((avatar: any) => 
      avatar.avatar_id === avatarId || avatar.avatar_name === avatarId
    );

    return NextResponse.json({
      success: true,
      token: tokenText.substring(0, 10) + '...', // Only return part of the token for security
      avatarExists: avatarExists,
      avatarId: avatarId,
      availableAvatars: avatarListData.data?.map((avatar: any) => ({
        id: avatar.avatar_id,
        name: avatar.avatar_name,
        type: avatar.avatar_type
      })) || []
    });
  } catch (error: any) {
    console.error('Error in test-heygen-avatar API route:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}