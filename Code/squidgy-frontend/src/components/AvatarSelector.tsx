'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AvatarSelectorProps {
  onAvatarChange: (avatarId: string) => void;
  currentAvatarId: string;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({ onAvatarChange, currentAvatarId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(true);
  const [avatar1Status, setAvatar1Status] = useState<'online' | 'busy'>('online');
  const [avatar2Status, setAvatar2Status] = useState<'online' | 'busy'>('online');
  
  // State for draggable position
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const selectorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Effect to detect if this tab is active
  useEffect(() => {
    const handleVisibilityChange = () => {
      setActiveTab(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check and update avatars status based on current selected avatar and tab activity
    setAvatar1Status(currentAvatarId === 'Anna_public_3_20240108' && activeTab ? 'online' : 'busy');
    setAvatar2Status(currentAvatarId === 'sol' && activeTab ? 'online' : 'busy');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, currentAvatarId]);

  // Update statuses when current avatar changes
  useEffect(() => {
    setAvatar1Status(currentAvatarId === 'Anna_public_3_20240108' && activeTab ? 'online' : 'busy');
    setAvatar2Status(currentAvatarId === 'sol' && activeTab ? 'online' : 'busy');
  }, [currentAvatarId, activeTab]);

  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectorRef.current) {
      const rect = selectorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners for mouse movement
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && 
          selectorRef.current && 
          !selectorRef.current.contains(event.target as Node) &&
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Add event listener for clicks on the document
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Clean up the event listener
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAvatarSelect = (avatarId: string) => {
    onAvatarChange(avatarId);
    setIsOpen(false);
  };

  return (
    <div 
      ref={selectorRef}
      className="fixed z-50" 
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <div className="relative">
        {/* Main selector button */}
        <div 
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
          onMouseDown={handleMouseDown}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          onMouseEnter={() => !isDragging && setIsOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* Dropdown with avatars */}
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute left-0 mt-2 bg-white rounded-lg shadow-xl p-3 w-32"
          >
            {/* Avatar 1 */}
            <div 
              className={`flex items-center p-2 rounded-lg mb-2 cursor-pointer ${
                currentAvatarId === 'Anna_public_3_20240108' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleAvatarSelect('presaleskb'); // Use agent ID instead of HeyGen ID
              }}
            >
              <div className="relative mr-2">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {/* Use real image for avatar 1 */}
                  <img 
                    src="/seth.JPG" 
                    alt="Avatar 1" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  avatar1Status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
              </div>
              <span className="text-sm">Avatar 1</span>
            </div>
            
            {/* Avatar 2 */}
            <div 
              className={`flex items-center p-2 rounded-lg cursor-pointer ${
                currentAvatarId === 'sol' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleAvatarSelect('socialmediakb'); // Use agent ID instead of HeyGen ID
              }}
            >
              <div className="relative mr-2">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {/* Use real image for avatar 2 */}
                  <img 
                    src="/sol.jpg" 
                    alt="Avatar 2" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  avatar2Status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
              </div>
              <span className="text-sm">Avatar 2</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarSelector;