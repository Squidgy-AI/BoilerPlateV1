// src/components/Auth/EnhancedLoginForm.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgotPassword';

const EnhancedLoginForm: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signIn, signUp, sendPasswordResetEmail } = useAuth();

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'whatsapp') => {
    try {
      setLoading(true);
      setError('');
      
      if (provider === 'google') {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`
          }
        });
      } else if (provider === 'apple') {
        await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: `${window.location.origin}/dashboard`
          }
        });
      } else if (provider === 'whatsapp') {
        // WhatsApp login would need a custom implementation
        // This is just a placeholder
        setError('WhatsApp login is coming soon');
      }
    } catch (err) {
      setError('Error with social login. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await signUp(email, password, fullName);
        setMessage('Registration successful! Please check your email to verify your account.');
        setMode('login');
      } else if (mode === 'forgotPassword') {
        await sendPasswordResetEmail(email);
        setMessage('Password reset link sent to your email!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2D3B4F] p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {mode === 'login' ? 'Login to Squidgy' : 
         mode === 'signup' ? 'Create Account' : 'Reset Password'}
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="fullName" className="block text-gray-300 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
              required={mode === 'signup'}
            />
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-gray-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
            required
          />
        </div>
        
        {mode !== 'forgotPassword' && (
          <div>
            <label htmlFor="password" className="block text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
              required={mode !== 'forgotPassword'}
            />
          </div>
        )}
        
        {mode === 'signup' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
              required={mode === 'signup'}
            />
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium transition-colors hover:bg-blue-700 disabled:bg-blue-500"
        >
          {loading ? 'Processing...' : 
           mode === 'login' ? 'Login' : 
           mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
        </button>
      </form>
      
      <div className="mt-6">
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-400">Or continue with</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mt-4">
          <button
            onClick={() => handleSocialLogin('google')}
            className="bg-white p-2 rounded-md hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <img src="/google-logo.svg" alt="Google" className="h-6 w-6 mx-auto" />
          </button>
          <button
            onClick={() => handleSocialLogin('apple')}
            className="bg-white p-2 rounded-md hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <img src="/apple-logo.svg" alt="Apple" className="h-6 w-6 mx-auto" />
          </button>
          <button
            onClick={() => handleSocialLogin('whatsapp')}
            className="bg-white p-2 rounded-md hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <img src="/whatsapp-logo.svg" alt="WhatsApp" className="h-6 w-6 mx-auto" />
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-center text-gray-400">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button 
              onClick={() => setMode('signup')}
              className="text-blue-400 hover:underline"
              type="button"
            >
              Sign Up
            </button>
          </>
        ) : mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button 
              onClick={() => setMode('login')}
              className="text-blue-400 hover:underline"
              type="button"
            >
              Login
            </button>
          </>
        ) : (
          <button 
            onClick={() => setMode('login')}
            className="text-blue-400 hover:underline"
            type="button"
          >
            Back to Login
          </button>
        )}
      </div>
      
      {mode === 'login' && (
        <div className="mt-4 text-center">
          <button 
            onClick={() => setMode('forgotPassword')}
            className="text-blue-400 hover:underline text-sm"
            type="button"
          >
            Forgot your password?
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedLoginForm;