// src/app/api/save-agent-setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { agent_id, agent_name, setup_json, firm_id } = body;

    // Validate required fields
    if (!agent_id || !agent_name || !setup_json) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, agent_name, setup_json' },
        { status: 400 }
      );
    }

    // Use user.id as firm_user_id
    const firm_user_id = user.id;
    
    // Use provided firm_id or generate a default one
    const actual_firm_id = firm_id || user.id; // Using user.id as default firm_id if not provided

    // Insert or update the agent setup
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_id: actual_firm_id,
        firm_user_id: firm_user_id,
        agent_id: agent_id,
        agent_name: agent_name,
        setup_json: setup_json,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_id,firm_user_id,agent_id',
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
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get agent_id from query params
    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    
    if (!agent_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: agent_id' },
        { status: 400 }
      );
    }

    const firm_user_id = user.id;
    const firm_id = user.id; // Using user.id as default firm_id

    // Retrieve the agent setup
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*')
      .eq('firm_id', firm_id)
      .eq('firm_user_id', firm_user_id)
      .eq('agent_id', agent_id)
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