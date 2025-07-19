// src/app/api/save-agent-setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

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
    const body = await request.json();
    const { agent_id, agent_name, setup_json, firm_id, setup_type } = body;

    // Validate required fields
    if (!agent_id || !agent_name || !setup_json || !setup_type) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, agent_name, setup_json, setup_type' },
        { status: 400 }
      );
    }

    // Use profile.user_id as firm_user_id (the correct foreign key)
    const firm_user_id = userIdResult.user_id;
    
    // Use provided firm_id or null as default
    const actual_firm_id = firm_id || null;

    // Insert or update the agent setup using correct conflict resolution
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_id: actual_firm_id,
        firm_user_id: firm_user_id,
        agent_id: agent_id,
        agent_name: agent_name,
        setup_type: setup_type,
        setup_json: setup_json,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id,agent_id,setup_type',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving agent setup:', error);
      
      // Handle specific errors
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Database table does not exist. Please ensure migrations are run.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to save agent setup', details: error.message },
        { status: 500 }
      );
    }

    console.log('Agent setup saved successfully:', data);

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Agent business setup saved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in save-agent-setup:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved configuration
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

    // Get agent_id and setup_type from query params
    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    const setup_type = searchParams.get('setup_type');
    
    if (!agent_id || !setup_type) {
      return NextResponse.json(
        { error: 'Missing required parameters: agent_id and setup_type' },
        { status: 400 }
      );
    }

    const firm_user_id = userIdResult.user_id;

    // Retrieve the agent setup using the unique constraint
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*')
      .eq('firm_user_id', firm_user_id)
      .eq('agent_id', agent_id)
      .eq('setup_type', setup_type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No configuration found'
        });
      }
      
      console.error('Error retrieving agent setup:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve agent setup', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Agent business setup retrieved successfully'
    });

  } catch (error) {
    console.error('Unexpected error in get-agent-setup:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}