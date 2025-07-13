// src/app/page.tsx
'use client';

import WelcomeScreen from '@/components/WelcomeScreen';

export default function Home() {
  return (
    <div className="min-h-screen w-full overflow-hidden">
      <WelcomeScreen />
    </div>
  );
}