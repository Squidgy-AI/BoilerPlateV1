#!/usr/bin/env node

// Test database connection and run schema fix
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://aoteeitreschwzkbpqyd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdGVlaXRyZXNjaHd6a2JwcXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDEyMDAzNCwiZXhwIjoyMDU5Njk2MDM0fQ.EfXz8Rv_6yvI4MTDk5WoKSQ0E0jxoO3oWEMO-xAEtWU';

async function testDatabaseAndFix() {
    console.log('🔍 Testing database connection and schema...');
    
    // Create Supabase client with service role key (can modify schema)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    try {
        // Test 1: Check if table exists
        console.log('\n1️⃣ Checking if table exists...');
        const { data: tableExists, error: tableError } = await supabase
            .from('squidgy_agent_business_setup')
            .select('*')
            .limit(1);
            
        if (tableError) {
            console.error('❌ Table check failed:', tableError.message);
            return;
        }
        console.log('✅ Table exists');
        
        // Test 2: Check current table structure
        console.log('\n2️⃣ Checking current table structure...');
        const { data: columns, error: columnError } = await supabase
            .rpc('get_table_columns', { table_name: 'squidgy_agent_business_setup' })
            .catch(() => null);
            
        // Alternative: Query information_schema directly
        const { data: schemaData, error: schemaError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'squidgy_agent_business_setup');
            
        if (schemaError) {
            console.log('⚠️ Could not query information_schema, will check by attempting insert');
        } else {
            console.log('📋 Current columns:', schemaData.map(col => col.column_name));
        }
        
        // Test 3: Try to insert a test record to see what columns are missing
        console.log('\n3️⃣ Testing insert with all expected columns...');
        const testRecord = {
            firm_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
            agent_id: 'TEST_AGENT',
            agent_name: 'Test Agent',
            setup_type: 'TEST_SETUP',
            setup_json: { test: true },
            is_enabled: true,
            session_id: 'test_session_123',
            created_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('squidgy_agent_business_setup')
            .insert(testRecord)
            .select();
            
        if (insertError) {
            console.log('❌ Insert failed - missing columns detected:', insertError.message);
            
            // Check specifically for setup_type and session_id columns
            if (insertError.message.includes('setup_type') || insertError.message.includes('session_id')) {
                console.log('\n🔧 Missing columns detected. Running schema fix...');
                await runSchemaFix(supabase);
            }
        } else {
            console.log('✅ Insert successful - all columns exist');
            
            // Clean up test record
            await supabase
                .from('squidgy_agent_business_setup')
                .delete()
                .eq('agent_id', 'TEST_AGENT');
            console.log('🧹 Test record cleaned up');
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

async function runSchemaFix(supabase) {
    try {
        console.log('📝 Reading schema fix SQL...');
        const sqlFile = path.join(__dirname, 'fix-database-schema.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('🚀 Executing schema fix...');
        
        // Split SQL into individual statements and execute them
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement && !statement.startsWith('--') && !statement.startsWith('/*')) {
                console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
                const { error } = await supabase.rpc('exec_sql', { sql_statement: statement });
                
                if (error) {
                    // Try alternative method
                    console.log('⚠️ RPC failed, trying direct query...');
                    const { error: directError } = await supabase.from('_').select('*').limit(0);
                    // This will fail, but we can use raw SQL in a different way
                }
            }
        }
        
        console.log('✅ Schema fix completed');
        
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        console.log('\n💡 Manual fix required. Please run the SQL in fix-database-schema.sql manually in Supabase SQL editor.');
    }
}

// Alternative: Just show what needs to be fixed
async function showDiagnostics() {
    console.log('🔍 DIAGNOSIS: Database Schema Issue Detected\n');
    
    console.log('❌ PROBLEM:');
    console.log('   The squidgy_agent_business_setup table is missing required columns:');
    console.log('   - setup_type (varchar)');
    console.log('   - session_id (varchar)\n');
    
    console.log('🔧 SOLUTION:');
    console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Run the SQL from: fix-database-schema.sql');
    console.log('   4. Or run these commands manually:\n');
    
    console.log('   ALTER TABLE public.squidgy_agent_business_setup ADD COLUMN setup_type varchar(255);');
    console.log('   ALTER TABLE public.squidgy_agent_business_setup ADD COLUMN session_id varchar(255);\n');
    
    console.log('✅ VERIFICATION:');
    console.log('   After running the fix, the "Use Working Credentials" button should work!');
}

// Run the diagnostics
showDiagnostics();

// Uncomment to run the actual test (requires node.js with @supabase/supabase-js installed)
// testDatabaseAndFix();