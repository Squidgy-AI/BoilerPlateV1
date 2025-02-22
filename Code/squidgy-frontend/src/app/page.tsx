'use client';

import Chatbot from '@/components/Chatbot';
import WelcomeScreen from '@/components/WelcomeScreen';

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <WelcomeScreen />
      <Chatbot />
    </div>
  );
}