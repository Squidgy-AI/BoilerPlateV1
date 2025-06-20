// src/components/Auth/EnhancedLoginForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import SquidgyLogo from './SquidgyLogo';

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

  // Clear error message when mode changes
  useEffect(() => {
    setError('');
    setMessage('');
  }, [mode]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        await signIn('email', { email, password });
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await signUp({ email, password, fullName });
        setMessage('Registration successful! Please check your email to verify your account.');
        setTimeout(() => {
          setMode('login');
        }, 2000);
      } else if (mode === 'forgotPassword') {
        await sendPasswordResetEmail(email);
        setMessage('Password reset link sent to your email!');
      }
    } catch (err: any) {
      // Handle rate limiting specifically
      if (err.message.includes('rate limit') || err.message.includes('Too many')) {
        setError('Too many attempts. Please wait 5-10 minutes and try again. If this persists, the rate limits may need to be adjusted in Supabase dashboard.');
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2D3B4F] p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="flex justify-center mb-6">
        <SquidgyLogo width={96} />
      </div>
      
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
        
        {(mode === 'login' || mode === 'signup') && (
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
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </div>
          ) : (
            mode === 'login' ? 'Login' : 
            mode === 'signup' ? 'Sign Up' : 'Send Reset Link'
          )}
        </button>
      </form>
      
      {/* Social login section hidden as requested */}
      {/*
      <div className="mt-6">
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-400">Or continue with</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mt-4">
          <button
            onClick={() => handleSocialLogin('google')}
            className="bg-white p-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>
          <button
            onClick={() => handleSocialLogin('apple')}
            className="bg-white p-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path d="M16.492 15.323c-.208.36-.455.691-.74.97-.285.28-.583.472-.891.575-.31.103-.619.155-.93.155-.396 0-.76-.085-1.087-.26a2.08 2.08 0 0 1-.82-.684 2.04 2.04 0 0 1-.832.684c-.343.175-.714.26-1.119.26-.318 0-.637-.052-.959-.155-.32-.103-.618-.295-.891-.575a3.888 3.888 0 0 1-.74-.97 3.558 3.558 0 0 1-.45-1.207 4.38 4.38 0 0 1-.117-1.35c.065-.903.312-1.666.74-2.29.43-.624.901-1.086 1.415-1.382.514-.297 1.01-.444 1.494-.444.266 0 .499.04.697.117.198.078.368.156.508.234.144.078.3.156.464.234.166.078.369.117.609.117.245 0 .447-.039.61-.117.161-.078.315-.156.464-.234.148-.078.317-.156.504-.234.188-.078.42-.117.697-.117.484 0 .981.148 1.494.444.514.296.987.762 1.42 1.398.37.535.629 1.131.777 1.79-1.033.51-1.548 1.435-1.547 2.776 0 .837.249 1.562.75 2.178z" />
              <path d="M13.371 7.471c-.401.427-.9.641-1.503.641-.047-.437.074-.865.36-1.286.143-.206.329-.378.557-.52.228-.14.479-.217.755-.232.058.466-.067.91-.37 1.397z" />
            </svg>
          </button>
          <button
            onClick={() => handleSocialLogin('whatsapp')}
            className="bg-white p-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#25D366" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path fill="#FFF" d="M17.3 14.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.46-.15-.66.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52a15.52 15.52 0 0 1-.66-1.62c-.18-.48-.35-.41-.48-.42h-.56c-.2 0-.53.08-.8.38-.27.3-1.05.97-1.05 2.36 0 1.4 1.02 2.74 1.17 2.94.15.2 2.03 3.1 4.92 4.36.69.3 1.22.48 1.64.62.69.22 1.31.19 1.81.1.55-.08 1.77-.72 2.02-1.42s.25-1.3.18-1.42c-.08-.13-.28-.21-.58-.36z"/>
            </svg>
          </button>
        </div>
      </div>
      */}
      
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