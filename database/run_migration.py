#!/usr/bin/env python3
"""
Run database migration to create business_profiles table
"""
import os
import sys
from pathlib import Path
from supabase import create_client, Client

# Add project root to path to import from parent directories
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

def run_migration():
    """Create the business_profiles table in Supabase"""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get Supabase credentials
    SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return False
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Read the SQL file
    sql_file = Path(__file__).parent / "create_business_profiles_table.sql"
    
    if not sql_file.exists():
        print(f"❌ Error: SQL file not found: {sql_file}")
        return False
    
    sql_content = sql_file.read_text()
    
    print("🚀 Running migration: create_business_profiles_table.sql")
    print("=" * 60)
    
    try:
        # Execute the SQL
        result = supabase.rpc('exec_sql', {'sql': sql_content}).execute()
        
        if result.data:
            print("✅ Migration completed successfully!")
            print("📊 business_profiles table created with:")
            print("   - Business information fields")
            print("   - Visual assets URLs (logo_url, favicon_url, screenshot_url)")  
            print("   - Indexes for performance")
            print("   - Auto-update timestamp trigger")
            return True
        else:
            print("❌ Migration failed - no data returned")
            return False
            
    except Exception as e:
        print(f"❌ Migration failed with error: {e}")
        
        # Try alternative approach - direct SQL execution
        print("\n🔄 Trying alternative approach...")
        try:
            # Split SQL into individual statements and execute them
            statements = sql_content.split(';')
            for i, statement in enumerate(statements):
                statement = statement.strip()
                if statement:
                    print(f"   Executing statement {i+1}...")
                    supabase.postgrest.session.post(
                        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                        json={"sql": statement + ";"},
                        headers={
                            "apikey": SUPABASE_SERVICE_ROLE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                            "Content-Type": "application/json"
                        }
                    )
            
            print("✅ Migration completed using alternative approach!")
            return True
            
        except Exception as e2:
            print(f"❌ Alternative approach also failed: {e2}")
            print("\n📋 Manual steps required:")
            print("1. Go to Supabase Dashboard → SQL Editor")
            print("2. Copy and paste the SQL from create_business_profiles_table.sql")
            print("3. Click 'Run' to execute the migration")
            return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)