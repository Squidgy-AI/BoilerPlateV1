// src/app/api/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Initializing Supabase admin client...');
console.log('URL:', supabaseUrl);
console.log('Service key exists:', !!supabaseServiceKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  },
});

export async function POST(request: NextRequest) {
  console.log('=== EMAIL TEST API CALLED ===');
  
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('Testing email to:', email);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key available:', !!supabaseServiceKey);

    console.log('Available methods on supabaseAdmin.auth:', Object.getOwnPropertyNames(supabaseAdmin.auth));
    console.log('Available methods on supabaseAdmin.auth.admin:', supabaseAdmin.auth.admin ? Object.getOwnPropertyNames(supabaseAdmin.auth.admin) : 'No admin object');

    // Test 1: Try checking if admin methods are available
    try {
      console.log('Testing admin functionality...');
      
      if (!supabaseAdmin.auth.admin) {
        throw new Error('Admin methods not available - check service role key');
      }
      
      // Try a simple admin operation first
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      console.log('Admin list users test:', { users: users?.users?.length || 0, error: listError });
      
      if (listError) {
        throw new Error(`Admin access failed: ${listError.message}`);
      }
      
      // Now try password reset
      console.log('Testing password reset email...');
      const { data, error } = await supabaseAdmin.auth.admin.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`
      });

      console.log('Password reset result:', { data, error });

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Password reset email failed',
          details: error.message,
          suggestion: 'Check your Supabase SMTP configuration'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully (password reset)',
        details: 'If you receive this email, your SMTP is working correctly'
      });

    } catch (testError) {
      console.error('Email test failed:', testError);
      
      return NextResponse.json({
        success: false,
        error: 'Email test failed',
        details: testError instanceof Error ? testError.message : 'Unknown error',
        suggestion: 'Check your Supabase SMTP settings and service role key'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process test email request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}