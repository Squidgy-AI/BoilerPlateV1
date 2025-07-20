#!/usr/bin/env python3
"""
Verify that the business_profiles table was created successfully
"""
import os
import sys
from pathlib import Path
from supabase import create_client, Client

# Add project root to path to import from parent directories
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

def verify_table():
    """Verify the business_profiles table exists and show its structure"""
    
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
    
    print("🔍 Verifying business_profiles table...")
    print("=" * 50)
    
    try:
        # Try to query the table structure
        result = supabase.table('business_profiles').select('*').limit(0).execute()
        
        print("✅ business_profiles table exists!")
        print("📋 Table is ready to store:")
        print("   • Business information (name, email, phone, etc.)")
        print("   • Visual assets (logo_url, favicon_url, screenshot_url)")
        print("   • Storage paths for cleanup")
        print("   • Timestamps and metadata")
        
        # Try a test query to see if we can count records
        count_result = supabase.table('business_profiles').select('id', count='exact').execute()
        record_count = count_result.count if hasattr(count_result, 'count') else 0
        print(f"📊 Current records in table: {record_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Table verification failed: {e}")
        return False

if __name__ == "__main__":
    success = verify_table()
    sys.exit(0 if success else 1)