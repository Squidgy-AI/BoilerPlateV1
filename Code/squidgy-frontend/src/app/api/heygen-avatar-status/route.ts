import { NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com';

/**
 * API endpoint to check HeyGen avatar status and connection
 * This helps diagnose issues with avatar streaming
 */
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

    console.log(`Checking HeyGen avatar status for ID: ${avatarId}`);

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

    // Check if the avatar exists by making a request to the avatar API
    const avatarCheckResponse = await fetch(
      `${HEYGEN_API_URL}/v1/avatar.get?avatar_id=${encodeURIComponent(avatarId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    let avatarExists = false;
    let avatarDetails = null;

    if (avatarCheckResponse.ok) {
      const avatarData = await avatarCheckResponse.json();
      avatarExists = true;
      avatarDetails = avatarData.data;
      console.log(`Avatar ${avatarId} exists and is accessible`);
    } else {
      const avatarErrorText = await avatarCheckResponse.text();
      console.error(`Avatar ${avatarId} check failed:`, avatarErrorText);
    }

    // Check account status and credits
    const accountResponse = await fetch(
      `${HEYGEN_API_URL}/v1/account.get`,
      {
        method: 'GET',
        headers: {
          'x-api-key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    let accountDetails = null;

    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      accountDetails = accountData.data;
      console.log('Account status retrieved successfully');
    } else {
      const accountErrorText = await accountResponse.text();
      console.error('Failed to check account status:', accountErrorText);
    }

    return NextResponse.json({
      success: true,
      token: tokenText.substring(0, 10) + '...', // Only return part of the token for security
      avatarExists: avatarExists,
      avatarId: avatarId,
      avatarDetails: avatarDetails,
      accountDetails: accountDetails
    });
  } catch (error: any) {
    console.error('Error in heygen-avatar-status API route:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}