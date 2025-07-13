import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🛠️ Creating squidgy_agent_business_setup table in public schema...');

    // Create service role client
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create the table in public schema
    const { data, error } = await supabaseServiceRole
      .rpc('create_solar_table', {});

    if (error && !error.message.includes('already exists')) {
      console.error('❌ Table creation failed:', error);
      
      // Try alternative approach - direct SQL if RPC doesn't work
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.squidgy_agent_business_setup (
          firm_id UUID,
          firm_user_id UUID NOT NULL,
          agent_id VARCHAR(255) NOT NULL,
          agent_name VARCHAR(255) NOT NULL,
          setup_json JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (firm_user_id, agent_id)
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_public_agent_setup_firm_user 
        ON public.squidgy_agent_business_setup(firm_user_id);
        
        CREATE INDEX IF NOT EXISTS idx_public_agent_setup_agent 
        ON public.squidgy_agent_business_setup(agent_id);
        
        CREATE INDEX IF NOT EXISTS idx_public_agent_setup_json 
        ON public.squidgy_agent_business_setup USING GIN(setup_json);
      `;
      
      // Note: Direct SQL execution might not work through client, 
      // but let's try anyway
      console.log('SQL to execute:', createTableSQL);
      
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        sql: createTableSQL,
        note: 'Run this SQL in Supabase SQL editor'
      });
    }

    console.log('✅ Table creation successful or already exists');

    // Test insert to verify table works
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const testConfig = { test: true, timestamp: new Date().toISOString() };

    const { data: insertData, error: insertError } = await supabaseServiceRole
      .from('squidgy_agent_business_setup')
      .insert({
        firm_id: null,
        firm_user_id: testUserId,
        agent_id: 'TEST_AGENT',
        agent_name: 'Test Agent',
        setup_json: testConfig
      })
      .select();

    if (insertError) {
      console.error('❌ Test insert failed:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: 'Table exists but insert failed',
        insertError: insertError.message
      });
    }

    console.log('✅ Test insert successful:', insertData);

    return res.status(200).json({
      success: true,
      message: 'Table created and tested successfully!',
      testInsert: insertData
    });

  } catch (error) {
    console.error('❌ API endpoint error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}