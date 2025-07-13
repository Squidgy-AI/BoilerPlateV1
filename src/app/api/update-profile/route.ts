import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  console.log("Profile update API called");
  
  try {
    const body = await request.json();
    const { userId, fullName, avatarUrl } = body;
    
    console.log("Update request for user:", userId);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Update profile directly with admin privileges
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Profile update error:', error);
      throw error;
    }
    
    console.log("Profile updated successfully");
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}