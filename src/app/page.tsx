// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WelcomeScreen from '@/components/WelcomeScreen';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if this is an invitation redirect
    const invitationToken = searchParams.get('invitation_token');
    const invitedBy = searchParams.get('invited_by');
    
    if (invitationToken) {
      // Redirect to the invite page with the token
      router.push(`/invite/${invitationToken}`);
    }
  }, [searchParams, router]);
  
  return (
    <div className="min-h-screen w-full overflow-hidden">
      <WelcomeScreen />
    </div>
  );
}