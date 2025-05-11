import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("Avatar upload API called");
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing file or userId' },
        { status: 400 }
      );
    }
    
    console.log("Upload for user:", userId, "File:", file.name);
    
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload with admin privileges to avatars bucket
    const { data, error } = await supabaseAdmin
      .storage
      .from('avatars')  // Use avatars bucket, not profiles
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('avatars')  // Use avatars bucket here too
      .getPublicUrl(fileName);
    
    console.log("Upload successful, URL:", publicUrl);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      path: fileName
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}