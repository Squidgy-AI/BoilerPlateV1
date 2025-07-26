'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth-service';

function ConfirmSignupContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get the tokens from URL parameters
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (!token_hash || type !== 'signup') {
          setStatus('error');
          setMessage('Invalid confirmation link. Please try signing up again.');
          return;
        }

        console.log('Confirming email with token:', { token_hash, type });

        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        });

        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          setMessage(`Confirmation failed: ${error.message}`);
          return;
        }

        if (!data.user) {
          setStatus('error');
          setMessage('Email confirmation failed. Please try signing up again.');
          return;
        }

        console.log('Email confirmed successfully:', data.user);

        // Now create the profile and related records
        try {
          await authService.completeUserProfile(data.user);
          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting to dashboard...');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } catch (profileError: any) {
          console.error('Profile creation error:', profileError);
          setStatus('error');
          setMessage(`Account confirmed but profile creation failed: ${profileError.message}`);
        }

      } catch (error: any) {
        console.error('Confirmation process error:', error);
        setStatus('error');
        setMessage(`Confirmation failed: ${error.message}`);
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