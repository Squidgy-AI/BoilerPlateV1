// src/app/api/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get redirect URL
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/reset-password`
      : `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://boiler-plate-v1-lake.vercel.app'}/auth/reset-password`;

    // Call backend API to send password reset email
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        redirect_url: redirectUrl
      }),
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send password reset email',
          message: result.message 
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Password reset link sent! Please check your email.'
    });

  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process password reset request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}