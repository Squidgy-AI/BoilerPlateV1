// src/components/Auth/ResetPasswordForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth-service';
import SquidgyLogo from './SquidgyLogo';

const ResetPasswordForm: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    setToken(tokenFromUrl);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!token) {
        throw new Error('Invalid reset token');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const result = await authService.resetPassword({
        token,
        newPassword
      });

      setMessage(result.message);
      
      // Redirect to login after successful reset
      setTimeout(() => {
        router.push('/login?message=Password reset successful');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="bg-[#2D3B4F] p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2D3B4F] p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="flex justify-center mb-6">
        <SquidgyLogo width={96} />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Reset Your Password
      </h2>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-green-500 text-white p-3 rounded-md mb-4">
          {message}
        </div>
      )}
      
      {!message && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-gray-300 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
              placeholder="Enter your new password"
              required
              minLength={8}
            />
            <p className="text-sm text-gray-400 mt-1">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
              placeholder="Confirm your new password"
              required
              minLength={8}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium transition-colors hover:bg-blue-700 disabled:bg-blue-500"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      )}
      
      <div className="mt-6 text-center">
        <button 
          onClick={() => router.push('/login')}
          className="text-blue-400 hover:underline text-sm"
          type="button"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordForm;