// src/components/Auth/SquidgyLogo.tsx
'use client';

import React from 'react';
import Image from 'next/image';

interface SquidgyLogoProps {
  width?: number;
  className?: string;
}

const SquidgyLogo: React.FC<SquidgyLogoProps> = ({ 
  width = 128, 
  className = "" 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div 
        className="rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center p-1"
        style={{ width: width, height: width }} // Make it square for perfect circle
      >
        <Image
          src="/images/squidgy-logo.jpeg"
          alt="Squidgy - AI-Powered Business Assistant"
          width={width}
          height={width}
          className="object-cover rounded-full filter brightness-110 contrast-105"
          priority
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>
    </div>
  );
};

export default SquidgyLogo;