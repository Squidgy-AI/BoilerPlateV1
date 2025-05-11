// src/components/ProfileSettings.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './Auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Settings, Camera, Save, X } from 'lucide-react';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, GIF, WEBP)' });
      return;
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'Image file is too large (max 5MB)' });
      return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    setAvatarFile(file);
    setMessage(null);
  };
  
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!profile) return null;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`; // Store in avatars folder
      
      // Upload to profiles bucket
      const { data, error } = await supabase
        .storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (error) throw error;
      
      setUploadProgress(100);
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('profiles')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    } finally {
      setIsUploading(false);
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
        try {
          const uploadedUrl = await uploadAvatar(avatarFile);
          if (uploadedUrl) {
            newAvatarUrl = uploadedUrl;
          }
        } catch (error: any) {
          throw new Error(`Avatar upload failed: ${error.message}`);
        }
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      // Refresh profile in AuthContext
      if (refreshProfile) {
        await refreshProfile();
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setAvatarFile(null);
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
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange}
                disabled={isUploading || isSaving}
              />
            </label>
            
            {isUploading && (
              <div className="w-full mt-2">
                <div className="text-xs text-gray-400 mb-1">
                  Uploading... {Math.round(uploadProgress)}%
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
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