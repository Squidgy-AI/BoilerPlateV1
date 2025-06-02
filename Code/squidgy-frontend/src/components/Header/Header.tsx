'use client';

import React from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useChat } from '../../context/ChatContext';
import { Menu, X, Settings, PlusCircle, LogOut } from 'lucide-react';
import ConnectionStatus from '../ConnectionStatus';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  onNewChat,
  onOpenSettings
}) => {
  const { profile, signOut } = useAuth();
  const { connectionStatus } = useChat();
  
  return (
    <header className="bg-[#2D3B4F] text-white fixed top-0 left-0 right-0 h-16 z-10 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={onToggleSidebar}
          className="p-2 mr-4 text-gray-400 hover:text-white rounded-md"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
        
        <h1 className="font-bold text-xl">Squidgy</h1>
        
        <div className="ml-4">
          <ConnectionStatus 
            status={connectionStatus}
            size="sm" 
            showLabel={true}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={onNewChat}
          className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <PlusCircle size={16} className="mr-2" />
          <span>New Chat</span>
        </button>
        
        <button
          onClick={onOpenSettings}
          className="p-2 text-gray-400 hover:text-white rounded-md"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
        
        <button
          onClick={() => signOut()}
          className="p-2 text-gray-400 hover:text-white rounded-md"
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
        
        <div className="flex items-center ml-2">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name || 'User'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{profile?.full_name?.charAt(0) || 'U'}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;