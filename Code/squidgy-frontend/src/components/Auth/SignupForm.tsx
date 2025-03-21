'use client';

import React, { useState } from 'react';

interface SignupFormProps {
  onSignupSuccess: (userId: string) => void;
  onSwitchToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      // This would be replaced with your actual API call
      // For now, we'll simulate a successful signup
      const userId = 'user_' + Math.random().toString(36).substring(7);
      
      // TODO: Replace with actual signup API call
      // const response = await fetch('/api/signup', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name, email, password }),
      // });
      // const data = await response.json();
      // if (!response.ok) throw new Error(data.message);
      
      // Call the onSignupSuccess callback with the user ID
      onSignupSuccess(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2D3B4F] p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSignup}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-300 mb-2">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
            required
          />
        </div>
        
        <div className="mb-4">
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
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium transition-colors hover:bg-blue-700 disabled:bg-blue-500 mb-4"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
        
        <div className="text-center text-gray-300">
          Already have an account?{' '}
          <button 
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:underline"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignupForm;