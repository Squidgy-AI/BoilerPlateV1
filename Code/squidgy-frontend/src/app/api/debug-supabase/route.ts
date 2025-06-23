// Debug endpoint to check Supabase configuration
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    return NextResponse.json({
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
      keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing',
      allEnvVars: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_BACKEND_URL: !!process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_FRONTEND_URL: !!process.env.NEXT_PUBLIC_FRONTEND_URL
      },
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to check environment variables',
      message: error.message 
    }, { status: 500 });
  }
}