// src/app/invite/[token]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';

interface InvitationData {
  id: string;
  sender_id: string;
  recipient_email: string;
  group_id: string | null;
  company_id: string | null;
  status: string;
  token: string;
  expires_at: string;
  sender?: {
    full_name?: string;
    email: string;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, signUp, signIn } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [processing, setProcessing] = useState(false);

  const token = params?.token as string;

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  useEffect(() => {
    // If user is already logged in, try to accept invitation automatically
    if (user && invitation && invitation.status === 'pending') {
      acceptInvitation();
    }
  }, [user, invitation]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          sender:profiles!sender_id(full_name, email)
        `)
        .eq('token', token)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        setError('Invitation not found');
        return;
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      if (data.status !== 'pending') {
        setError('This invitation has already been used');
        return;
      }

      setInvitation(data);
      setEmail(data.recipient_email);
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!invitation || !user || !profile) return;

    try {
      setProcessing(true);

      // Update invitation status
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          recipient_id: profile.user_id
        })
        .eq('id', invitation.id);

      if (updateError) {
        throw updateError;
      }

      // If there's a group_id, add user to the group
      if (invitation.group_id) {
        const { error: groupError } = await supabase
          .from('group_members')
          .insert({
            group_id: invitation.group_id,
            user_id: profile.user_id,
            role: 'member'
          });

        if (groupError) {
          console.warn('Failed to add user to group:', groupError);
        }
      }

      // Update user's company_id if invitation has one
      if (invitation.company_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: invitation.company_id })
          .eq('id', user.id);

        if (profileError) {
          console.warn('Failed to update user company:', profileError);
        }
      }

      router.push('/dashboard?invitation=accepted');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleAuth = async () => {
    if (!invitation) return;

    try {
      setProcessing(true);
      setError(null);

      if (isSignUp) {
        await signUp({ email, password, fullName });
        // After signup, user will be automatically logged in and acceptInvitation will be called
      } else {
        await signIn('email', { email, password });
        // After signin, acceptInvitation will be called automatically
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No invitation found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-blue-500 text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-gray-600">
            <strong>{invitation.sender?.full_name || invitation.sender?.email}</strong> 
            {' '}invited you to join Squidgy
          </p>
        </div>

        {user ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              You're logged in as <strong>{user.email}</strong>
            </p>
            <button
              onClick={acceptInvitation}
              disabled={processing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {processing ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                disabled={processing}
              />
            </div>

            {isSignUp && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                  disabled={processing}
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                disabled={processing}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={processing || !email || !password || (isSignUp && !fullName)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mb-4"
            >
              {processing ? 'Processing...' : (isSignUp ? 'Create Account & Accept' : 'Sign In & Accept')}
            </button>

            <div className="text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-700 text-sm"
                disabled={processing}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}