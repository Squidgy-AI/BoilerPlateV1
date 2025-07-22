#!/usr/bin/env python3
"""
Simple test using the working password reset email method
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📧 Sending test email via password reset...")
print("Target: somasekhar.addakula@gmail.com")
print("-" * 50)

try:
    response = supabase.auth.reset_password_email(
        email="somasekhar.addakula@gmail.com",
        options={
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/test"
        }
    )
    
    print("✅ Email sent successfully!")
    print("📬 Check your email inbox (and spam folder)")
    print("🔗 This proves SMTP is working correctly")
    
except Exception as e:
    print(f"❌ Error: {e}")
    
print("\nNow let's test the invitation method that should work...")
print("-" * 50)

try:
    # Try the correct admin invite method (without 'data' parameter)
    response = supabase.auth.admin.invite_user_by_email("somasekhar.addakula@gmail.com")
    print("✅ Invitation email sent successfully!")
    print(f"Response: {response}")
    
except Exception as e:
    print(f"❌ Invitation error: {e}")
    print("Let's check available admin methods...")
    print("Admin methods:", [method for method in dir(supabase.auth.admin) if not method.startswith('_')])