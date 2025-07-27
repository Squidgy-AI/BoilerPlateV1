// src/app/api/send-invitation-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

    // Call backend API to send invitation email (similar to reset-password pattern)
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
    const response = await fetch(`${backendUrl}/api/send-invitation-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        token,
        senderName,
        inviteUrl,
        senderId,
        companyId,
        groupId
      }),
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // Even if backend fails, try to save invitation locally as fallback
      try {
        console.log('Backend failed, saving invitation locally as fallback...');
        
        // Check if invitation already exists
        const { data: existingInvite } = await supabaseAdmin
          .from('invitations')
          .select('id, status')
          .eq('recipient_email', email)
          .eq('status', 'pending')
          .single();

        if (existingInvite) {
          return NextResponse.json({
            success: true,
            message: 'Invitation already exists. Please check your email or use the link below.',
            fallback_url: inviteUrl,
            method: 'existing_invitation'
          });
        }

        // Generate a unique recipient_id
        const recipientId = uuidv4();
        
        // Create invitation record in database
        const { data: inviteRecord, error: inviteError } = await supabaseAdmin
          .from('invitations')
          .insert({
            sender_id: senderId,
            recipient_id: recipientId,
            recipient_email: email,
            token: token,
            status: 'pending',
            sender_company_id: companyId || null,
            group_id: groupId || null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (inviteError) {
          throw new Error(`Database error: ${inviteError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Invitation created successfully. Email sending failed, please share the link manually.',
          fallback_url: inviteUrl,
          method: 'fallback_local_save',
          warning: 'Backend email failed but invitation was saved locally',
          invitation_id: inviteRecord.id
        });

      } catch (fallbackError) {
        return NextResponse.json(
          { 
            success: false, 
            error: result.error || 'Failed to send invitation email',
            message: result.message,
            fallback_url: inviteUrl,
            details: `Backend: ${result.details || 'Unknown'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`
          },
          { status: response.status || 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Invitation email sent successfully!',
      method: 'backend_email',
      details: result.details
    });

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