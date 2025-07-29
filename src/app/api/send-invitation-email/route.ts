// src/app/api/send-invitation-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { v4 as uuidv4 } from 'uuid'; // Not needed anymore

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
  console.log('=== EMAIL API ROUTE CALLED - TIMESTAMP:', new Date().toISOString(), '===');
  
  try {
    const body = await request.json();
    let { email, token, senderName, inviteUrl, senderId, companyId, groupId } = body;
    
    console.log('Email API request body:', JSON.stringify(body, null, 2));
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

    // Check if user is trying to invite themselves
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', senderId)
      .single();

    if (senderProfile && senderProfile.email?.toLowerCase() === email.toLowerCase()) {
      console.warn('User attempting to invite themselves:', { senderEmail: senderProfile.email, inviteEmail: email });
      return NextResponse.json(
        { 
          success: false,
          error: 'Cannot invite yourself',
          details: 'You cannot send an invitation to your own email address'
        },
        { status: 400 }
      );
    }

    // Skip backend for now and send email directly using Supabase
    console.log('Sending invitation email directly using Supabase...');
    
    try {
      // Check if user already exists to set recipient_id
      let recipientId = null;
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        recipientId = existingUser.user_id;
        console.log('Found existing user:', recipientId);
      }

      // Upsert invitation based on sender_id + recipient_email
      const { data: inviteRecord, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .upsert({
          sender_id: senderId,
          recipient_id: recipientId,
          recipient_email: email,
          token: token,
          status: 'pending',
          sender_company_id: companyId || null,
          group_id: groupId || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'sender_id,recipient_email',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (inviteError) {
        throw new Error(`Database error: ${inviteError.message}`);
      }

      console.log('Invitation saved to database, attempting to send email...');

      // Send magic link email - this works reliably
      let emailMethod = 'magic_link';
      try {
        console.log(`Sending magic link to ${email}`);
        
        // Using signInWithOtp WITHOUT shouldCreateUser to force magic link template
        const otpResult = await supabaseAdmin.auth.signInWithOtp({
          email: email,
          options: {
            // Remove shouldCreateUser to avoid signup confirmation email
            emailRedirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://boiler-plate-v1-lake.vercel.app'}/?invited_by=${encodeURIComponent(senderName)}&invitation_token=${token}`,
            data: {
              invitation_token: token,
              sender_name: senderName
            }
          }
        });
        console.log('Magic link result:', JSON.stringify(otpResult, null, 2));
        let emailError = otpResult.error;
        
        if (emailError) {
          console.warn('Email sending failed:', emailError);
          return NextResponse.json({
            success: true,
            message: 'Invitation created successfully. Email sending failed, please share the link manually.',
            fallback_url: inviteUrl,
            method: 'direct_save_no_email',
            warning: 'Email sending failed but invitation was saved',
            invitation_id: inviteRecord.id
          });
        }
        
        console.log('Magic link email sent successfully!');
        
        return NextResponse.json({
          success: true,
          message: 'Invitation email sent successfully!',
          method: 'magic_link',
          email_type: 'magic_link',
          invitation_id: inviteRecord.id
        });
        
      } catch (emailError) {
        console.warn('Email sending failed:', emailError);
        return NextResponse.json({
          success: true,
          message: 'Invitation created successfully. Email sending failed, please share the link manually.',
          fallback_url: inviteUrl,
          method: 'direct_save_no_email',
          warning: 'Email sending failed but invitation was saved',
          invitation_id: inviteRecord.id
        });
      }

    } catch (error) {
      console.error('Direct invitation failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create invitation',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallback_url: inviteUrl
        },
        { status: 500 }
      );
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