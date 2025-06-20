// src/app/api/send-invitation-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== SIMPLE EMAIL API CALLED ===');
  
  try {
    const { email, token, senderName, inviteUrl } = await request.json();
    
    console.log('Simple email request:', { email, token, senderName });

    if (!email || !token || !inviteUrl) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields'
        },
        { status: 400 }
      );
    }

    // Method 1: Try using direct SMTP via webhook to n8n or external service
    // For now, let's just return the invitation URL for manual sharing
    
    console.log('Creating manual invitation response...');
    
    return NextResponse.json({
      success: false,
      error: 'Email automation not configured',
      fallback_url: inviteUrl,
      message: `Please share this invitation link manually with ${email}`,
      details: 'SMTP configuration issue - manual link sharing required',
      invitation_info: {
        recipient: email,
        sender: senderName,
        link: inviteUrl,
        expires: '7 days'
      }
    }, { status: 500 });

  } catch (error) {
    console.error('Simple email API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process invitation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}