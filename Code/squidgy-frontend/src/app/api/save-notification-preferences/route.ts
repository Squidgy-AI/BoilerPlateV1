// src/app/api/save-notification-preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';
import { NotificationPreferences } from '@/config/calendarNotificationConfig';

export async function POST(request: NextRequest) {
  try {
    // Get the correct user_id from profiles table
    const userIdResult = await getUserId();
    
    if (!userIdResult.success || !userIdResult.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized or failed to get user profile' },
        { status: 401 }
      );
    }

    // Get request body
    const notificationPrefs: NotificationPreferences = await request.json();

    // Validate contact info when channels are enabled
    if (notificationPrefs.email_enabled && !notificationPrefs.email_address) {
      return NextResponse.json(
        { error: 'Email address is required when email notifications are enabled' },
        { status: 400 }
      );
    }

    if (notificationPrefs.sms_enabled && !notificationPrefs.phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required when SMS notifications are enabled' },
        { status: 400 }
      );
    }

    if (notificationPrefs.whatsapp_enabled && !notificationPrefs.whatsapp_number) {
      return NextResponse.json(
        { error: 'WhatsApp number is required when WhatsApp notifications are enabled' },
        { status: 400 }
      );
    }

    const firm_user_id = userIdResult.user_id;

    // Ensure Facebook Messenger is always enabled
    notificationPrefs.fb_messenger_enabled = true;
    // Ensure GHL App is always disabled for now
    notificationPrefs.ghl_app_enabled = false;

    // Upsert notification preferences (insert or update if exists)
    const { data, error } = await supabase
      .from('business_notification_preferences')
      .upsert({
        firm_user_id,
        ...notificationPrefs,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save notification preferences', details: error.message },
        { status: 500 }
      );
    }

    console.log('Notification preferences saved successfully:', data);

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Notification preferences saved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in save-notification-preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved notification preferences
export async function GET(request: NextRequest) {
  try {
    // Get the correct user_id from profiles table
    const userIdResult = await getUserId();
    
    if (!userIdResult.success || !userIdResult.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized or failed to get user profile' },
        { status: 401 }
      );
    }

    const firm_user_id = userIdResult.user_id;

    // Retrieve notification preferences
    const { data, error } = await supabase
      .from('business_notification_preferences')
      .select('*')
      .eq('firm_user_id', firm_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No notification preferences found'
        });
      }
      
      console.error('Error retrieving notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve notification preferences', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Notification preferences retrieved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in get-notification-preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}