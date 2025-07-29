// src/app/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WelcomeScreen from '@/components/WelcomeScreen';

function HomeContent() {
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
  
  return <WelcomeScreen />;
}

export default function Home() {
  return (
    <div className="min-h-screen w-full overflow-hidden">
      <Suspense fallback={<WelcomeScreen />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}