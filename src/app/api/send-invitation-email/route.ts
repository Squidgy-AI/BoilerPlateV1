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
    const { email, token, senderName, inviteUrl, senderId, companyId, groupId } = body;
    
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

    // Skip backend for now and send email directly using Supabase
    console.log('Sending invitation email directly using Supabase...');
    
    try {
      // Check if invitation already exists
      const { data: existingInvite, error: checkError } = await supabaseAdmin
        .from('invitations')
        .select('id, status, token')
        .eq('recipient_email', email)
        .eq('status', 'pending')
        .single();
      
      console.log('Existing invite check:', { existingInvite, checkError });

      if (existingInvite && !checkError) {
        // Cancel old invitation and create new one
        console.log('Found existing invitation, canceling it and creating new one');
        
        const { error: updateError } = await supabaseAdmin
          .from('invitations')
          .update({ status: 'cancelled' })
          .eq('id', existingInvite.id);
          
        if (updateError) {
          console.error('Failed to cancel old invitation:', updateError);
        }
        
        // Continue to create new invitation below
      }
      

      // Create invitation record in database (recipient_id will be set when accepted)
      const { data: inviteRecord, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .insert({
          sender_id: senderId,
          recipient_id: null, // Will be set when invitation is accepted
          recipient_email: email,
          token: token,
          status: 'pending',
          sender_company_id: companyId || null,
          group_id: groupId || null, // Only set if it's a valid group ID
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
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
        
        // IMPORTANT: Using signInWithOtp for MAGIC LINK emails
        // This should send "Your Magic Invitation Link" template, NOT reset password
        const otpResult = await supabaseAdmin.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: true, // Create user if doesn't exist
            emailRedirectTo: inviteUrl,
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