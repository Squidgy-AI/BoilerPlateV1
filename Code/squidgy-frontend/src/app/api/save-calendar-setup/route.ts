// src/app/api/save-calendar-setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';
import { CalendarSetup } from '@/config/calendarNotificationConfig';

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
    const calendarSetup: CalendarSetup = await request.json();

    // Validate required fields
    if (!calendarSetup.calendar_name) {
      return NextResponse.json(
        { error: 'Calendar name is required' },
        { status: 400 }
      );
    }

    const firm_user_id = userIdResult.user_id;

    // Upsert calendar setup (insert or update if exists)
    const { data, error } = await supabase
      .from('business_calendar_setup')
      .upsert({
        firm_user_id,
        ...calendarSetup,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving calendar setup:', error);
      return NextResponse.json(
        { error: 'Failed to save calendar setup', details: error.message },
        { status: 500 }
      );
    }

    console.log('Calendar setup saved successfully:', data);

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Calendar setup saved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in save-calendar-setup:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved calendar setup
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

    // Retrieve calendar setup
    const { data, error } = await supabase
      .from('business_calendar_setup')
      .select('*')
      .eq('firm_user_id', firm_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No calendar setup found'
        });
      }
      
      console.error('Error retrieving calendar setup:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve calendar setup', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Calendar setup retrieved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in get-calendar-setup:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}