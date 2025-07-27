'use client';

import { useRouter } from 'next/navigation';

function ConfirmSignupContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Registration Successful!
          </h2>
          
          <div className="mt-4">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <p className="text-green-600 font-semibold">
              Your registration has been confirmed successfully!
            </p>
            <p className="text-gray-600 mt-2">
              You can now log in with your credentials.
            </p>
            
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmSignupPage() {
  return <ConfirmSignupContent />;
}