// src/components/ProfileSettings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Settings, Camera, Save, X } from 'lucide-react';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAvatarUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      setAvatarFile(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    setIsSaving(true);
    setMessage(null);
    
    try {
      let newAvatarUrl = avatarUrl;
      
      // Upload avatar if changed
      if (avatarFile) {
        setIsUploading(true);
        
        try {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          
          // Upload directly to storage
          const { data, error } = await supabase
            .storage
            .from('profiles')
            .upload(`${profile.id}/${fileName}`, avatarFile, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (error) throw error;
          
          // Get public URL
          const { data: urlData } = supabase
            .storage
            .from('profiles')
            .getPublicUrl(`${profile.id}/${fileName}`);
          
          newAvatarUrl = urlData.publicUrl;
        } catch (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw new Error('Failed to upload avatar: ' + (uploadError.message || 'Unknown error'));
        } finally {
          setIsUploading(false);
        }
      }
      
      // Call the database function to update profile
      console.log('Updating profile with:', {
        p_user_id: profile.id,
        p_full_name: fullName,
        p_avatar_url: newAvatarUrl
      });
      
      const { data, error } = await supabase.rpc('update_profile', {
        p_user_id: profile.id,
        p_full_name: fullName,
        p_avatar_url: newAvatarUrl
      });
      
      if (error) {
        console.error('Database function error:', error);
        throw error;
      }
      
      console.log('Profile updated successfully:', data);
      
      // If we got back data.success === false, it's an error from the function
      if (data && data.success === false) {
        throw new Error(data.error || 'Error in database function');
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Update local avatar URL state to show the update immediately
      setAvatarUrl(newAvatarUrl);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error updating profile. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2D3B4F] rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Settings className="mr-2" size={20} />
            Profile Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Avatar Upload */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-700 rounded-full overflow-hidden relative mb-3">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={fullName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {fullName.charAt(0) || 'U'}
                </div>
              )}
            </div>
            
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md cursor-pointer flex items-center text-sm">
              <Camera size={16} className="mr-2" />
              {isUploading ? 'Uploading...' : 'Change Profile Picture'}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange}
                disabled={isUploading || isSaving}
              />
            </label>
          </div>
          
          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
              required
            />
          </div>
          
          {/* Email - read only */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              className="w-full p-3 bg-[#1E2A3B] text-white rounded-md opacity-70"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;