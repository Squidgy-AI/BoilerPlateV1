import React from 'react';

interface ConnectionLostBannerProps {
  onRetry: () => void;
  message?: string;
}

const ConnectionLostBanner: React.FC<ConnectionLostBannerProps> = ({ onRetry, message }) => (
  <div className="fixed top-0 left-0 w-full bg-red-600 text-white flex items-center justify-center py-2 z-50 shadow-lg">
    <span className="mr-4 font-semibold">
      {message || 'Connection to server lost. Please check your internet connection or retry.'}
    </span>
    <button
      onClick={onRetry}
      className="bg-white text-red-700 px-4 py-1 rounded font-bold hover:bg-red-100 transition"
    >
      Retry
    </button>
  </div>
);

export default ConnectionLostBanner;
