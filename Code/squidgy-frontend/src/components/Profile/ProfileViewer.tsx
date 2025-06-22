// src/components/Profile/ProfileViewer.tsx
'use client';

import React from 'react';
import { X, Mail, Calendar, Building2, User, MapPin } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at: string;
  company_id?: string;
  connection_type?: string;
}

interface ProfileViewerProps {
  profile: Profile;
  onClose: () => void;
}

const ProfileViewer: React.FC<ProfileViewerProps> = ({ profile, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Avatar and Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mb-4 overflow-hidden">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl text-white">
                {profile.full_name?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-white text-center">
            {profile.full_name}
          </h3>
          {profile.role && (
            <p className="text-gray-400 text-sm mt-1">{profile.role}</p>
          )}
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center space-x-3">
            <Mail className="text-blue-400" size={18} />
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white">{profile.email}</p>
            </div>
          </div>

          {/* Connection Type */}
          {profile.connection_type && (
            <div className="flex items-center space-x-3">
              <User className="text-green-400" size={18} />
              <div>
                <p className="text-gray-400 text-sm">Connection</p>
                <p className="text-white capitalize">{profile.connection_type}</p>
              </div>
            </div>
          )}

          {/* Company */}
          {profile.company_id && (
            <div className="flex items-center space-x-3">
              <Building2 className="text-purple-400" size={18} />
              <div>
                <p className="text-gray-400 text-sm">Company</p>
                <p className="text-white">Same Organization</p>
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="flex items-center space-x-3">
            <Calendar className="text-yellow-400" size={18} />
            <div>
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="text-white">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => {
              // TODO: Implement start chat functionality
              console.log('Start chat with:', profile.full_name);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Start Chat
          </button>
          
          <button
            onClick={() => {
              // TODO: Implement send email functionality
              window.open(`mailto:${profile.email}`, '_blank');
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileViewer;