#!/usr/bin/env python3
"""
Check the correct parameters for generate_link
"""
import os
import inspect
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔍 Checking generate_link method signature...")
print("-" * 50)

try:
    # Get method signature
    sig = inspect.signature(supabase.auth.admin.generate_link)
    print(f"Method signature: {sig}")
    
    # Get docstring if available
    doc = supabase.auth.admin.generate_link.__doc__
    if doc:
        print(f"Documentation: {doc}")
    else:
        print("No documentation available")
        
except Exception as e:
    print(f"Error inspecting method: {e}")

print("\n🧪 Testing different parameter formats...")
print("-" * 50)

# Test 1: Positional parameters
try:
    print("TEST 1: Positional parameters...")
    response = supabase.auth.admin.generate_link("invite", "somasekhar.addakula@gmail.com")
    print("✅ Success with positional params!")
    print(f"Response: {response}")
except Exception as e:
    print(f"❌ Error with positional params: {e}")

# Test 2: Different keyword structure
try:
    print("\nTEST 2: Different keyword structure...")
    response = supabase.auth.admin.generate_link(
        "invite",
        "somasekhar.addakula@gmail.com",
        {
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/invite/test123"
        }
    )
    print("✅ Success with different structure!")
    print(f"Response: {response}")
except Exception as e:
    print(f"❌ Error with different structure: {e}")

# Test 3: Check what parameters it actually expects
try:
    print("\nTEST 3: Minimal call to see error...")
    response = supabase.auth.admin.generate_link()
except Exception as e:
    print(f"Method expects: {e}")
    print("This tells us the required parameters!")

print("\n🔄 Let's try the invite_user_by_email method again...")
print("-" * 50)

try:
    response = supabase.auth.admin.invite_user_by_email("somasekhar.addakula@gmail.com")
    print("✅ Invite sent successfully!")
    print(f"Response: {response}")
except Exception as e:
    print(f"❌ Invite error: {e}")
    print("This might be a timeout issue, not a method issue")