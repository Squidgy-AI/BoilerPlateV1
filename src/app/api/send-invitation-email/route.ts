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
      const { data: existingInvite } = await supabaseAdmin
        .from('invitations')
        .select('id, status')
        .eq('recipient_email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        // Try resending email for existing invitation
        try {
          // Check if user exists and use appropriate email method
          const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
          const userExists = existingUser?.user && !checkError;
          
          let emailError = null;
          let emailMethod = 'unknown';
          
          if (userExists) {
            console.log('Resending via reset password for existing user');
            const resetResult = await supabaseAdmin.auth.resetPasswordForEmail(email, {
              redirectTo: inviteUrl
            });
            emailError = resetResult.error;
            emailMethod = 'reset_password_existing';
          } else {
            console.log('Resending via proper invitation for new user');
            const inviteResult = await supabaseAdmin.auth.admin.generateLink({
              type: 'invite',
              email: email,
              options: {
                redirectTo: inviteUrl
              }
            });
            emailError = inviteResult.error;
            emailMethod = 'proper_invitation_new';
          }
          
          if (emailError) {
            console.warn('Email resending failed:', emailError);
            return NextResponse.json({
              success: true,
              message: 'Invitation already exists. Please check your email or use the link below.',
              fallback_url: inviteUrl,
              method: 'existing_invitation'
            });
          }
          
          return NextResponse.json({
            success: true,
            message: emailMethod === 'proper_invitation_new' ? 'Invitation email resent successfully!' : 'Invitation resent! (Reset password email used for existing user)',
            method: `resent_${emailMethod}`,
            email_type: emailMethod
          });
          
        } catch (emailError) {
          return NextResponse.json({
            success: true,
            message: 'Invitation already exists. Please check your email or use the link below.',
            fallback_url: inviteUrl,
            method: 'existing_invitation'
          });
        }
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

      // Check if user exists and use appropriate email method
      let emailMethod = 'unknown';
      try {
        // Check if user already exists in auth.users
        const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        const userExists = existingUser?.user && !checkError;
        
        console.log(`User ${email} exists: ${userExists}`);
        
        let emailError = null;
        
        if (userExists) {
          // User exists - use reset password with invitation URL
          console.log('Using reset password for existing user');
          const resetResult = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: inviteUrl
          });
          emailError = resetResult.error;
          emailMethod = 'reset_password_existing';
        } else {
          // User doesn't exist - try proper invitation
          console.log('Using invite for new user');
          const inviteResult = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
              redirectTo: inviteUrl
            }
          });
          emailError = inviteResult.error;
          emailMethod = 'proper_invitation_new';
        }
        
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
        
        console.log('Email sent successfully!');
        return NextResponse.json({
          success: true,
          message: emailMethod === 'proper_invitation_new' ? 'Invitation email sent successfully!' : 'Invitation sent! (Reset password email used for existing user)',
          method: `direct_${emailMethod}`,
          email_type: emailMethod,
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