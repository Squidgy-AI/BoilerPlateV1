// Development helper to reset onboarding for testing
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuth } from './Auth/AuthProvider';

const OnboardingResetButton: React.FC = () => {
  const { profile } = useAuth();
  const { resetOnboarding, hasCompletedOnboarding } = useOnboardingStatus(profile?.id);

  // Only show in development or for testing
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleReset = () => {
    if (confirm('Reset onboarding? This will show the 3-step setup again.')) {
      resetOnboarding();
      window.location.reload(); // Refresh to trigger onboarding
    }
  };

  return (
    <button
      onClick={handleReset}
      className="fixed bottom-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
      title={`Reset Onboarding (Status: ${hasCompletedOnboarding ? 'Completed' : 'Not Completed'})`}
    >
      <RotateCcw size={16} />
    </button>
  );
};

export default OnboardingResetButton;