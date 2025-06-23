'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAuth() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing Supabase connection...');
      
      // Test a simple query that doesn't require authentication
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      console.log('Supabase test result:', { data, error });
      
      setResult({
        success: !error,
        error: error?.message || null,
        data: data || null,
        supabaseUrl: (process as any).env?.NEXT_PUBLIC_SUPABASE_URL || 'not available',
        supabaseKey: (process as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing'
      });
    } catch (err: any) {
      console.error('Test error:', err);
      setResult({
        success: false,
        error: err.message,
        data: null
      });
    } finally {
      setLoading(false);
    }
  };

  const testSignup = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing signup...');
      
      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      console.log('Signup test result:', { data, error });
      
      setResult({
        signup: true,
        success: !error,
        error: error?.message || null,
        data: data || null
      });
    } catch (err: any) {
      console.error('Signup test error:', err);
      setResult({
        signup: true,
        success: false,
        error: err.message,
        data: null
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 Client-side environment check:', {
      url: typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL : 'undefined',
      hasWindow: typeof window !== 'undefined'
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Database Connection'}
          </button>
          
          <button
            onClick={testSignup}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Signup'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Test Result:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}