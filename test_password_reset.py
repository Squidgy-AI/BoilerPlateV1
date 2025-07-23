#!/usr/bin/env python3
"""
Test the password reset functionality
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

print("🔑 TESTING PASSWORD RESET")
print("=" * 50)

# Test password reset
try:
    print("Sending password reset to: somasekhar.addakula@gmail.com")
    print("Redirect URL: https://boiler-plate-v1-lake.vercel.app/auth/reset-password")
    
    response = supabase.auth.reset_password_for_email(
        email="somasekhar.addakula@gmail.com",
        options={
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/auth/reset-password"
        }
    )
    
    print("✅ Password reset email sent successfully!")
    print("Response:", response)
    print("\n📬 Check your email for the password reset link")
    
except Exception as e:
    print(f"❌ Password reset failed: {e}")
    print(f"Error type: {type(e).__name__}")
    print(f"Error details: {str(e)}")

print("\n" + "=" * 50)
print("TEST COMPLETE")