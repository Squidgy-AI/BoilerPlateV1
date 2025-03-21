'use client';

import React, { useState } from 'react';
import Auth from './Auth/Auth';
import Chatbot from './Chatbot';

const WelcomeScreen: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');

  const handleAuthenticated = (userId: string) => {
    setUserId(userId);
    setIsAuthenticated(true);
  };

// For the login view
if (!isAuthenticated) {
  return (
    <div className="w-full h-screen bg-[#1B2431] flex items-center justify-center overflow-hidden">
      <Auth onAuthenticated={handleAuthenticated} />
    </div>
  );
}

// For the post-login view
return (
  <div className="flex w-full h-screen overflow-hidden">
    <div className="w-[45%] bg-[#1B2431] flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-7xl font-bold tracking-wide">
          HI I AM
          <br />
          SQUIDGY
        </h1>
        <p className="text-4xl mt-4">HELLO {userId}</p>
      </div>
    </div>
    <Chatbot userId={userId} />
  </div>
);
};

export default WelcomeScreen;