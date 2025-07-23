#!/usr/bin/env python3
"""
Try to directly verify SMTP configuration
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

print("🔧 DIRECT SMTP TEST")
print("=" * 50)
print("Testing direct connection to Office365 SMTP...")

# SMTP settings from your screenshots
SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 465
SMTP_USERNAME = "info@squidgy.ai"
SMTP_PASSWORD = "YOUR_PASSWORD_HERE"  # You'll need to provide this

print(f"Host: {SMTP_SERVER}")
print(f"Port: {SMTP_PORT}")
print(f"Username: {SMTP_USERNAME}")
print("=" * 50)

# Test 1: Try to connect to SMTP server
print("\n📡 TEST 1: SMTP Server Connection")
print("-" * 30)

try:
    # Create SSL context
    context = ssl.create_default_context()
    
    # Connect to server
    print("Connecting to SMTP server...")
    server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context)
    print("✅ Connected to SMTP server successfully")
    
    # Try to login (will fail without password, but shows if server accepts connections)
    print("Testing server response...")
    server.ehlo()  # Identify ourselves to the server
    print("✅ Server responded to EHLO")
    
    server.quit()
    print("✅ SMTP server is accessible")
    
except Exception as e:
    print(f"❌ SMTP connection failed: {e}")

# Test 2: Check if Supabase is actually using SMTP
print("\n⚙️ TEST 2: Supabase SMTP Status Check")
print("-" * 30)

print("Based on our tests:")
print("1. ✅ API calls to generate_link() succeed")
print("2. ✅ Users are created in Supabase")
print("3. ❌ No emails are received")
print("4. ❌ Password reset also times out now")

print("\n🔍 This pattern suggests:")
print("• Supabase accepts the SMTP config but can't actually send emails")
print("• Possible authentication failure with Office365")
print("• Or email templates are not configured")

print("\n📋 IMMEDIATE ACTION ITEMS:")
print("1. Go to Supabase Dashboard > Authentication > Email Templates")
print("2. Check if templates for 'Invite user' and 'Reset password' exist")
print("3. Verify SMTP settings are 'Enabled' (not just configured)")
print("4. Check if you need an 'App Password' for Office365 SMTP")
print("5. Look at Supabase logs for email sending errors")

print("\n🔐 OFFICE365 SMTP REQUIREMENTS:")
print("• Modern authentication might be required")
print("• App passwords instead of regular passwords")
print("• Multi-factor authentication compliance")
print("• Check if 'Less secure app access' is enabled")

print("\n⚡ QUICK TEST - Check Supabase Dashboard:")
print("1. Go to Authentication > Settings > SMTP Settings") 
print("2. Look for 'Test SMTP' button and click it")
print("3. This will tell us if Supabase can actually send emails")
print("4. Check the logs section for any SMTP errors")