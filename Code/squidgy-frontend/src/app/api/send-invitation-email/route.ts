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
    const { email, token, senderName, inviteUrl } = await request.json();
    
    console.log('Email API request data:', { email, token, senderName, inviteUrl });

    if (!email || !token || !inviteUrl) {
      console.error('Missing required fields:', { email: !!email, token: !!token, inviteUrl: !!inviteUrl });
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          details: `Missing: ${!email ? 'email ' : ''}${!token ? 'token ' : ''}${!inviteUrl ? 'inviteUrl' : ''}`
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

    // Method 1: Try using Supabase auth invite first
    try {
      console.log('Attempting Supabase auth.admin.inviteUserByEmail...');
      
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
        data: {
          sender_name: senderName,
          invitation_token: token,
          invitation_type: 'team_invite'
        }
      });

      console.log('Supabase invite result:', { data, error });

      if (error) {
        console.error('Supabase invite error:', error);
        throw new Error(`Supabase invite failed: ${error.message}`);
      }

      console.log('Supabase invitation sent successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Invitation email sent successfully via Supabase Auth',
        method: 'supabase_auth'
      });

    } catch (supabaseError) {
      console.error('Supabase email method failed:', supabaseError);
      
      // Method 2: Try using Edge Functions or direct database trigger
      try {
        console.log('Attempting fallback email method...');
        
        // Insert a record that could trigger an email via database function
        const { data: emailRecord, error: emailError } = await supabaseAdmin
          .from('email_queue')
          .insert({
            recipient_email: email,
            email_type: 'invitation',
            subject: `${senderName} invited you to join Squidgy`,
            template_data: {
              sender_name: senderName,
              invite_url: inviteUrl,
              token: token
            },
            status: 'pending'
          })
          .select()
          .single();

        if (emailError) {
          console.log('Email queue table does not exist, using manual approach');
          
          // Method 3: Return success with manual link
          return NextResponse.json({
            success: false,
            error: 'Email sending failed - SMTP configuration issue',
            details: supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error',
            fallback_url: inviteUrl,
            suggestion: 'Check Supabase Auth settings and SMTP configuration in dashboard'
          }, { status: 500 });
        }

        console.log('Email queued successfully:', emailRecord);
        return NextResponse.json({
          success: true,
          message: 'Invitation queued for email delivery',
          method: 'email_queue'
        });

      } catch (fallbackError) {
        console.error('Fallback email method failed:', fallbackError);
        
        return NextResponse.json({
          success: false,
          error: 'All email methods failed',
          details: {
            supabase_error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
            fallback_error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          },
          fallback_url: inviteUrl,
          suggestion: 'Please share the invitation link manually or check your email configuration'
        }, { status: 500 });
      }
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