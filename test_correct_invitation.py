#!/usr/bin/env python3
"""
Test invitation with correct generate_link parameters
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📧 Testing invitation email with correct parameters...")
print("Target: somasekhar.addakula@gmail.com")
print("-" * 50)

# Test 1: Invite link
try:
    print("TEST 1: Generate invite link...")
    response = supabase.auth.admin.generate_link({
        "type": "invite",
        "email": "somasekhar.addakula@gmail.com",
        "options": {
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/invite/test123",
            "data": {
                "invitation_token": "test_token_123",
                "sender_name": "Squidgy Test",
                "message": "You're invited to join Squidgy!"
            }
        }
    })
    
    print("✅ Invite link generated successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Invite link error: {e}")

print("\n" + "-" * 50)

# Test 2: Magic link (alternative)
try:
    print("TEST 2: Generate magic link...")
    response = supabase.auth.admin.generate_link({
        "type": "magiclink",
        "email": "somasekhar.addakula@gmail.com",
        "options": {
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/invite/magic456"
        }
    })
    
    print("✅ Magic link generated successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Magic link error: {e}")

print("\n" + "-" * 50)

# Test 3: Recovery link (just to test another type)
try:
    print("TEST 3: Generate recovery link...")
    response = supabase.auth.admin.generate_link({
        "type": "recovery",
        "email": "somasekhar.addakula@gmail.com",
        "options": {
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/auth/reset-password"
        }
    })
    
    print("✅ Recovery link generated successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Recovery link error: {e}")

print("\n📬 Check your email inbox and spam folder!")
print("If any of these worked, you should receive an email with the invitation.")