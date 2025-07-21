#!/usr/bin/env python3
"""
Create business_profiles table using direct SQL execution
"""
import os
import sys
import psycopg2
from pathlib import Path

# Add project root to path to import from parent directories
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

def create_table_direct():
    """Create the business_profiles table using direct PostgreSQL connection"""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get database URL
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        print("❌ Error: Missing DATABASE_URL environment variable")
        return False
    
    # Read the SQL file
    sql_file = Path(__file__).parent / "create_business_profiles_table.sql"
    
    if not sql_file.exists():
        print(f"❌ Error: SQL file not found: {sql_file}")
        return False
    
    sql_content = sql_file.read_text()
    
    print("🚀 Creating business_profiles table...")
    print("=" * 50)
    
    try:
        # Connect to PostgreSQL database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Execute the SQL
        cursor.execute(sql_content)
        conn.commit()
        
        print("✅ business_profiles table created successfully!")
        print("📊 Table includes:")
        print("   • id (uuid, primary key)")
        print("   • firm_user_id (foreign key to profiles)")
        print("   • Business fields (name, email, phone, etc.)")
        print("   • Visual assets (logo_url, favicon_url, screenshot_url)")
        print("   • Storage paths for cleanup")
        print("   • Indexes for performance")
        print("   • Auto-update timestamp trigger")
        
        # Verify the table was created
        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'business_profiles'")
        table_exists = cursor.fetchone()[0] > 0
        
        if table_exists:
            print("✅ Table verification successful!")
        else:
            print("❌ Table verification failed!")
            
        cursor.close()
        conn.close()
        return table_exists
        
    except Exception as e:
        print(f"❌ Failed to create table: {e}")
        return False

if __name__ == "__main__":
    success = create_table_direct()
    sys.exit(0 if success else 1)