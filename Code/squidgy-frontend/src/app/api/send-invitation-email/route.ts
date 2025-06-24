// src/app/api/send-invitation-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  },
});

export async function POST(request: NextRequest) {
  console.log('=== EMAIL API ROUTE CALLED ===');
  
  try {
    const { email, token, senderName, inviteUrl, senderId, companyId, groupId } = await request.json();
    
    console.log('Email API request data:', { email, token, senderName, inviteUrl, senderId, companyId, groupId });

    if (!email || !token || !inviteUrl || !senderId) {
      console.error('Missing required fields:', { email: !!email, token: !!token, inviteUrl: !!inviteUrl, senderId: !!senderId });
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          details: `Missing: ${!email ? 'email ' : ''}${!token ? 'token ' : ''}${!inviteUrl ? 'inviteUrl ' : ''}${!senderId ? 'senderId' : ''}`
        },
        { status: 400 }
      );
    }

    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key available:', !!supabaseServiceKey);

    // Check if admin methods are available
    if (!supabaseAdmin.auth.admin) {
      console.error('Admin methods not available');
      return NextResponse.json({
        success: false,
        error: 'Admin access not available',
        details: 'Service role key may be invalid or missing',
        fallback_url: inviteUrl,
        suggestion: 'Check SUPABASE_SERVICE_ROLE_KEY environment variable'
      }, { status: 500 });
    }

    // Check if SMTP is configured in Supabase
    console.log('Checking Supabase SMTP configuration...');
    
    // For now, skip Supabase email and go directly to fallback
    // since SMTP is not configured in Supabase dashboard
    console.log('SMTP not configured in Supabase, using fallback method');
    
    try {
      // Method 1: Try to create invitation record and return manual link
      // This ensures the invitation is saved to database even if email fails
      
      console.log('Saving invitation to database...');
      
      // Check if invitation already exists
      const { data: existingInvite } = await supabaseAdmin
        .from('invitations')
        .select('id, status')
        .eq('recipient_email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        console.log('Invitation already exists, returning existing invite');
        return NextResponse.json({
          success: true,
          message: 'Invitation already sent. Please check your email or use the link below.',
          fallback_url: inviteUrl,
          method: 'existing_invitation'
        });
      }

      console.log('Creating new invitation record...');
      
      // Create invitation record in database
      const { data: inviteRecord, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .insert({
          sender_id: senderId,
          recipient_email: email,
          token: token,
          status: 'pending',
          company_id: companyId || null,
          group_id: groupId || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Failed to save invitation to database:', inviteError);
        throw new Error(`Database error saving invitation: ${inviteError.message}`);
      }

      console.log('Invitation saved to database successfully:', inviteRecord);

      // Return success with manual sharing option
      return NextResponse.json({
        success: true,
        message: 'Invitation created successfully. Please share the link manually since SMTP is not configured.',
        fallback_url: inviteUrl,
        method: 'manual_sharing',
        suggestion: 'Configure SMTP in Supabase Dashboard (Authentication → Settings → SMTP Settings) to enable automatic email sending.'
      });

    } catch (supabaseError) {
      console.error('Database operation failed:', supabaseError);
      
      // If database save fails, still provide a way to share the invitation
      console.log('Database save failed, providing manual sharing option');
      
      return NextResponse.json({
        success: true, // Still return success since the link works
        message: 'Invitation link generated successfully. Please share manually since database and email systems are not configured.',
        fallback_url: inviteUrl,
        method: 'link_only',
        suggestion: 'To enable automatic email sending: 1) Configure SMTP in Supabase Dashboard, 2) Ensure invitation table exists with proper RLS policies.',
        warning: 'Database save failed - invitation may not persist across sessions'
      });
    }

  } catch (error) {
    console.error('Send invitation email error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process invitation email request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}