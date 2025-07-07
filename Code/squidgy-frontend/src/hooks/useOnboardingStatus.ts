// Hook to manage onboarding status for new users
import { useState, useEffect } from 'react';

export const useOnboardingStatus = (userId?: string) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Check localStorage for onboarding completion
    const storageKey = `onboarding_completed_${userId}`;
    const completed = localStorage.getItem(storageKey) === 'true';
    
    setHasCompletedOnboarding(completed);
    setIsLoading(false);
  }, [userId]);

  const markOnboardingComplete = () => {
    if (userId) {
      localStorage.setItem(`onboarding_completed_${userId}`, 'true');
      setHasCompletedOnboarding(true);
    }
  };

  const resetOnboarding = () => {
    if (userId) {
      localStorage.removeItem(`onboarding_completed_${userId}`);
      setHasCompletedOnboarding(false);
    }
  };

  return {
    hasCompletedOnboarding,
    isLoading,
    markOnboardingComplete,
    resetOnboarding
  };
};