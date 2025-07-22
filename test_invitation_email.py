#!/usr/bin/env python3
"""
Test the correct invitation email method using generate_link
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔗 Testing invitation email using generate_link...")
print("Target: somasekhar.addakula@gmail.com")
print("-" * 50)

try:
    # Test Method 1: Generate link for signup
    print("TEST 1: Generate signup link...")
    response = supabase.auth.admin.generate_link(
        type="signup",
        email="somasekhar.addakula@gmail.com",
        options={
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/invite/test123"
        }
    )
    
    print("✅ Signup link generated successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Signup link error: {e}")

print("\n" + "-" * 50)

try:
    # Test Method 2: Generate magic link
    print("TEST 2: Generate magic link...")
    response = supabase.auth.admin.generate_link(
        type="magiclink", 
        email="somasekhar.addakula@gmail.com",
        options={
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/invite/test456"
        }
    )
    
    print("✅ Magic link generated successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Magic link error: {e}")

print("\n" + "-" * 50)

try:
    # Test Method 3: Generate invite link (this should be the one!)
    print("TEST 3: Generate invite link...")
    response = supabase.auth.admin.generate_link(
        type="invite",
        email="somasekhar.addakula@gmail.com",
        options={
            "data": {
                "invitation_token": "test_token_123",
                "sender_name": "Squidgy Test"
            },
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/invite/test789"
        }
    )
    
    print("✅ Invite link generated successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Invite link error: {e}")

print("\n📬 Check your email inbox and spam folder!")
print("If any of these worked, you should receive an email.")