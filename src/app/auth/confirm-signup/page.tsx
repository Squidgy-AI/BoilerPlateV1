'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ConfirmSignupContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Check for error parameters first
        const error = searchParams.get('error');
        const error_code = searchParams.get('error_code');
        const error_description = searchParams.get('error_description');

        if (error) {
          console.error('Confirmation error from URL:', { error, error_code, error_description });
          setStatus('error');
          
          if (error_code === 'otp_expired') {
            setMessage('The confirmation link has expired. Please sign up again to receive a new confirmation email.');
          } else {
            setMessage(`Confirmation failed: ${error_description || error}`);
          }
          return;
        }

        // Get the tokens from URL parameters - handle multiple formats
        const token_hash = searchParams.get('token_hash');
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');

        console.log('URL parameters:', { 
          token_hash, 
          token, 
          type, 
          access_token: access_token ? 'present' : 'missing',
          refresh_token: refresh_token ? 'present' : 'missing',
          allParams: Object.fromEntries(searchParams.entries())
        });

        // Try different confirmation methods based on available parameters
        let data, confirmError;

        if (access_token && refresh_token) {
          // Method 1: Direct session from tokens (older format)
          console.log('Using direct session method');
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          data = sessionData;
          confirmError = sessionError;
        } else if (token_hash && type === 'signup') {
          // Method 2: Verify OTP with token_hash (newer format)
          console.log('Using verifyOtp method with token_hash');
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'signup'
          });
          data = verifyData;
          confirmError = verifyError;
        } else if (token) {
          // Method 3: Try with regular token
          console.log('Using verifyOtp method with token');
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token,
            type: 'signup'
          });
          data = verifyData;
          confirmError = verifyError;
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Missing required parameters. Please try signing up again.');
          return;
        }

        if (confirmError) {
          console.error('Email confirmation error:', confirmError);
          setStatus('error');
          setMessage(`Confirmation failed: ${confirmError.message}`);
          return;
        }

        if (!data.user) {
          setStatus('error');
          setMessage('Email confirmation failed. Please try signing up again.');
          return;
        }

        console.log('Email confirmed successfully:', data.user);

        // Create ALL database records now that email is confirmed
        try {
          console.log('Creating database records for confirmed user...');
          
          // Generate company/firm ID
          const companyId = crypto.randomUUID();
          
          // Create profile record
          const profileData = {
            id: data.user.id,
            user_id: crypto.randomUUID(), // Generate user_id
            email: data.user.email.toLowerCase(),
            full_name: data.user.user_metadata?.full_name || '',
            profile_avatar_url: null,
            company_id: companyId,
            role: 'member'
          };

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();

          if (profileError) {
            console.error('Profile creation failed:', profileError);
            throw new Error(`Profile creation failed: ${profileError.message}`);
          }

          console.log('✅ Profile created successfully');

          // Create business_profiles record
          const { error: businessProfileError } = await supabase
            .from('business_profiles')
            .upsert({
              firm_user_id: profile.user_id,
              firm_id: companyId
            }, {
              onConflict: 'firm_user_id'
            });

          if (businessProfileError) {
            console.error('Business profile creation failed:', businessProfileError);
          } else {
            console.log('✅ Business profile created successfully');
          }

          // Create PersonalAssistant agent record
          const sessionId = crypto.randomUUID();
          const personalAssistantConfig = {
            description: "Your general-purpose AI assistant",
            capabilities: ["general_chat", "help", "information"]
          };

          const { error: agentError } = await supabase
            .from('squidgy_agent_business_setup')
            .insert({
              firm_id: companyId,
              firm_user_id: profile.user_id,
              agent_id: 'PersonalAssistant',
              agent_name: 'Personal Assistant',
              setup_type: 'agent_config',
              setup_json: personalAssistantConfig,
              is_enabled: true,
              session_id: sessionId
            });

          if (agentError) {
            console.error('PersonalAssistant agent creation failed:', agentError);
          } else {
            console.log('✅ PersonalAssistant agent created successfully');
          }

          console.log('✅ All database records created successfully');

        } catch (profileError: any) {
          console.error('Database record creation error:', profileError);
          // Still redirect to main page even if database creation fails
        }
        
        // Always redirect to main landing page after creating records
        console.log('Redirecting to main landing page...');
        window.location.href = 'https://boiler-plate-v1-lake.vercel.app/';

      } catch (error: any) {
        console.error('Confirmation process error:', error);
        // Even if confirmation fails, redirect to main page
        // User can always try logging in or signing up again
        console.log('Redirecting to main page due to confirmation error...');
        window.location.href = 'https://boiler-plate-v1-lake.vercel.app/';
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirming Email</h2>
              <p className="text-gray-600">Please wait while we confirm your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
              <p className="text-red-600 mb-4">{message}</p>
              <button
                onClick={() => router.push('/signup')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Try Signing Up Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <ConfirmSignupContent />
    </Suspense>
  );
}