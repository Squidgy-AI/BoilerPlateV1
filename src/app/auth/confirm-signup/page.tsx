'use client';

import { useEffect, useState, Suspense } from 'react';
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
        // Get token and type from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || !type) {
          throw new Error('Missing confirmation parameters');
        }

        console.log('🔗 Confirming email with token type:', type);

        // Verify the email confirmation
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'email'
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('Email confirmation failed');
        }

        console.log('✅ Email confirmed for user:', data.user.id);

        // Simply set email_confirmed = true in profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email_confirmed: true })
          .eq('id', data.user.id);

        if (updateError) {
          throw new Error(`Failed to update email confirmation: ${updateError.message}`);
        }

        console.log('✅ Profile updated: email_confirmed = true');

        // Show success
        setStatus('success');
        setMessage('Registration confirmed! You can now log in with your credentials.');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);

      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Email confirmation failed');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Email Confirmation
          </h2>
          
          {status === 'loading' && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Confirming your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-4">
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <p className="text-green-600 font-semibold">{message}</p>
              <p className="text-gray-600 mt-2">Redirecting to login...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4">
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <p className="text-red-600 font-semibold">{message}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Loading...</h2>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Please wait...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ConfirmSignupContent />
    </Suspense>
  );
}