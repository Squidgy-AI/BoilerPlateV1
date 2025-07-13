// src/app/reset-password/page.tsx
import React, { Suspense } from 'react';
import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';

const ResetPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#1A2332] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-[#2D3B4F] p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-300">Loading...</p>
          </div>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
};

export default ResetPasswordPage;