#!/usr/bin/env python3
"""
Test Supabase email sending capabilities
"""
import os
import sys
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("=" * 60)
print("SUPABASE EMAIL TEST")
print("=" * 60)
print(f"Supabase URL: {SUPABASE_URL}")
print(f"Service Key Available: {'Yes' if SUPABASE_SERVICE_KEY else 'No'}")
print(f"Service Key Length: {len(SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else 0}")
print("=" * 60)

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

# Create Supabase client with service role
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def test_auth_email():
    """Test sending auth email (password reset)"""
    print("\n📧 TEST 1: Password Reset Email")
    print("-" * 40)
    
    try:
        # This uses Supabase's built-in email templates
        response = supabase.auth.reset_password_email(
            email="somasekhar.addakula@gmail.com",
            options={
                "redirect_to": "https://boiler-plate-v1-lake.vercel.app/auth/reset-password"
            }
        )
        
        print("✅ Password reset email sent successfully!")
        print(f"Response: {response}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending password reset email: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def test_magic_link():
    """Test sending magic link email"""
    print("\n🔗 TEST 2: Magic Link Email")
    print("-" * 40)
    
    try:
        # Send magic link
        response = supabase.auth.sign_in_with_otp({
            "email": "somasekhar.addakula@gmail.com",
            "options": {
                "email_redirect_to": "https://boiler-plate-v1-lake.vercel.app/dashboard"
            }
        })
        
        print("✅ Magic link email sent successfully!")
        print(f"Response: {response}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending magic link: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def test_invite_user():
    """Test inviting a user via Supabase Admin API"""
    print("\n👥 TEST 3: Invite User Email")
    print("-" * 40)
    
    try:
        # Try using admin API to invite user
        # Note: This requires admin privileges
        response = supabase.auth.admin.invite_user_by_email(
            email="somasekhar.addakula@gmail.com",
            data={
                "invitation_type": "test",
                "sender_name": "Squidgy Test",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        print("✅ Invite email sent successfully!")
        print(f"Response: {response}")
        return True
        
    except AttributeError as e:
        print(f"❌ Admin API not available: {e}")
        print("This suggests the service role key might not have admin privileges")
        return False
    except Exception as e:
        print(f"❌ Error sending invite: {e}")
        print(f"Error type: {type(e).__name__}")
        if hasattr(e, 'message'):
            print(f"Error message: {e.message}")
        return False

def test_custom_email():
    """Test sending custom email via Supabase"""
    print("\n✉️ TEST 4: Custom Email (if available)")
    print("-" * 40)
    
    try:
        # Check if we can access Supabase's email functionality
        # This is not a standard Supabase feature, but some installations have it
        
        # First, let's check what methods are available
        print("Available auth methods:", dir(supabase.auth))
        
        if hasattr(supabase.auth, 'send_email'):
            response = supabase.auth.send_email({
                "to": "somasekhar.addakula@gmail.com",
                "subject": "Test Email from Squidgy",
                "html": "<h1>Test Email</h1><p>This is a test email from Squidgy to verify SMTP configuration.</p>",
                "text": "Test Email\n\nThis is a test email from Squidgy to verify SMTP configuration."
            })
            print("✅ Custom email sent successfully!")
            print(f"Response: {response}")
            return True
        else:
            print("ℹ️ Custom email sending not available in standard Supabase")
            return False
            
    except Exception as e:
        print(f"❌ Error with custom email: {e}")
        return False

def check_smtp_config():
    """Try to check SMTP configuration via Supabase"""
    print("\n🔧 TEST 5: Check SMTP Configuration")
    print("-" * 40)
    
    try:
        # Try to get project settings (requires admin access)
        # This is not standard API, but worth trying
        print("Attempting to check SMTP configuration...")
        
        # Check if we have admin access
        if hasattr(supabase.auth, 'admin'):
            print("✅ Admin access available")
            
            # Try to list users to verify admin access works
            try:
                users = supabase.auth.admin.list_users()
                print(f"✅ Admin API working - found {len(users) if users else 0} users")
            except Exception as e:
                print(f"❌ Admin API error: {e}")
        else:
            print("❌ No admin access available")
            
    except Exception as e:
        print(f"❌ Error checking config: {e}")

# Run all tests
print("\n🚀 Starting Email Tests...")
print("Target email: somasekhar.addakula@gmail.com")
print("=" * 60)

# Run tests
test_results = {
    "Password Reset": test_auth_email(),
    "Magic Link": test_magic_link(),
    "Invite User": test_invite_user(),
    "Custom Email": test_custom_email()
}

# Check configuration
check_smtp_config()

# Summary
print("\n" + "=" * 60)
print("📊 TEST SUMMARY")
print("=" * 60)
for test_name, result in test_results.items():
    status = "✅ PASSED" if result else "❌ FAILED"
    print(f"{test_name}: {status}")

print("\n💡 RECOMMENDATIONS:")
if not any(test_results.values()):
    print("❌ No email tests passed. Possible issues:")
    print("1. SMTP might not be properly configured in Supabase")
    print("2. Service role key might not have email sending permissions")
    print("3. Email rate limits might be exceeded")
    print("4. Check Supabase dashboard > Authentication > Email Templates")
    print("5. Check Supabase dashboard > Settings > SMTP Settings")
else:
    print("✅ Some email functionality is working!")
    print("Check your email (including spam folder) for test messages.")

print("\n🔍 Next Steps:")
print("1. Check your email inbox and spam folder")
print("2. Check Supabase logs in the dashboard")
print("3. Verify SMTP settings are saved and enabled in Supabase")
print("4. Make sure email templates are configured")