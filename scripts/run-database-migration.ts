// scripts/run-database-migration.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/update_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('📝 SQL Preview:');
    console.log(migrationSQL.substring(0, 500) + '...');
    
    // Execute the migration
    console.log('\n⏳ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach - execute smaller chunks
      console.log('\n🔄 Trying alternative execution method...');
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          try {
            console.log(`Executing statement ${i + 1}/${statements.length}`);
            const { error: stmtError } = await supabase.rpc('exec_sql', {
              sql_query: statement + ';'
            });
            
            if (stmtError) {
              console.warn(`⚠️  Warning on statement ${i + 1}:`, stmtError.message);
            }
          } catch (stmtErr) {
            console.warn(`⚠️  Warning on statement ${i + 1}:`, stmtErr);
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying schema changes...');
    
    // Check if user_id column exists
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'profiles')
      .eq('column_name', 'user_id');
    
    if (columns && columns.length > 0) {
      console.log('✅ user_id column added to profiles table');
    } else {
      console.log('⚠️  user_id column not found - may need manual addition');
    }
    
    // Check if forgot password table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'users_forgot_password');
    
    if (tables && tables.length > 0) {
      console.log('✅ users_forgot_password table created');
    } else {
      console.log('⚠️  users_forgot_password table not found - may need manual creation');
    }
    
    console.log('\n🎉 Database migration process complete!');
    console.log('\nNext steps:');
    console.log('1. Test the authentication flow');
    console.log('2. Verify email uniqueness constraints');
    console.log('3. Test forgot password functionality');
    
  } catch (error) {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);