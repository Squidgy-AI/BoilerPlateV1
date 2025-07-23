#!/usr/bin/env python3
"""
Debug why emails aren't being received despite successful API calls
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔍 DEBUGGING EMAIL ISSUE")
print("=" * 60)
print("The API calls are successful but no emails are received.")
print("Let's check what's actually happening...")
print("=" * 60)

# Test 1: Check if we can see email audit logs (if available)
print("\n📊 TEST 1: Check Supabase email configurations")
print("-" * 50)

try:
    # Try to get project settings to see if SMTP is actually enabled
    print("Checking if we can access project settings...")
    
    # This is a long shot, but let's see what info we can get
    # from the auth admin endpoint
    users = supabase.auth.admin.list_users()
    print(f"✅ Admin access confirmed - {len(users.data) if users.data else 0} users found")
    
    # Check if any users have confirmed emails
    confirmed_users = [u for u in users.data if u.email_confirmed_at] if users.data else []
    print(f"Users with confirmed emails: {len(confirmed_users)}")
    
except Exception as e:
    print(f"❌ Error accessing admin data: {e}")

# Test 2: Try sending to a different email to see if it's email-specific
print("\n📧 TEST 2: Send to different email addresses")
print("-" * 50)

test_emails = [
    "somasekhar.addakula@gmail.com",  # Your primary email
    "test@example.com",               # Invalid domain (should fail)
]

for test_email in test_emails:
    print(f"\nTesting with: {test_email}")
    try:
        response = supabase.auth.admin.generate_link({
            "type": "invite",
            "email": test_email,
            "options": {
                "redirect_to": "https://boiler-plate-v1-lake.vercel.app/test"
            }
        })
        
        print(f"✅ API call successful for {test_email}")
        print(f"User ID created: {response.user.id if response.user else 'None'}")
        print(f"Email confirmed: {response.user.email_confirmed_at if response.user else 'None'}")
        print(f"Invited at: {response.user.invited_at if response.user else 'None'}")
        
    except Exception as e:
        print(f"❌ Error for {test_email}: {e}")

# Test 3: Try the old reliable password reset method
print("\n🔄 TEST 3: Test password reset (known to work)")
print("-" * 50)

try:
    print("Sending password reset to somasekhar.addakula@gmail.com...")
    response = supabase.auth.reset_password_email(
        email="somasekhar.addakula@gmail.com",
        options={
            "redirect_to": "https://boiler-plate-v1-lake.vercel.app/test-reset"
        }
    )
    print("✅ Password reset sent successfully")
    print("📬 Check your email for this one - it should arrive")
    
except Exception as e:
    print(f"❌ Password reset failed: {e}")

# Test 4: Check rate limits and SMTP status
print("\n⚡ TEST 4: Check for rate limiting issues")
print("-" * 50)

print("Attempting multiple rapid emails to test rate limits...")
for i in range(3):
    try:
        response = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": "somasekhar.addakula@gmail.com",
            "options": {
                "redirect_to": f"https://boiler-plate-v1-lake.vercel.app/test-{i}"
            }
        })
        print(f"✅ Rapid test {i+1} successful")
    except Exception as e:
        print(f"❌ Rapid test {i+1} failed: {e}")
        if "rate" in str(e).lower() or "limit" in str(e).lower():
            print("🚨 RATE LIMITING DETECTED!")
            break

print("\n" + "=" * 60)
print("🎯 POSSIBLE ISSUES:")
print("=" * 60)
print("1. SMTP configuration might not be fully enabled")
print("2. Rate limiting on email sending")
print("3. Email provider (Office365) blocking automated emails")
print("4. Supabase email queue might have delays")
print("5. Email templates might not be configured")
print("6. Domain reputation issues")

print("\n💡 NEXT STEPS:")
print("1. Check your Supabase dashboard > Auth > Email Templates")
print("2. Check Supabase dashboard > Settings > SMTP Settings (verify it's enabled)")
print("3. Check Office365 admin panel for any blocked emails")
print("4. Look at Supabase logs in the dashboard")
print("5. Try sending to a different email provider (like Yahoo/Outlook)")