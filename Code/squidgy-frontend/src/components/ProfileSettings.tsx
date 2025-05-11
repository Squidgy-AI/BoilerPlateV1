// Enhanced ProfileSettings.tsx with robust image upload
import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Settings, Camera, Save, X, Upload, AlertCircle } from 'lucide-react';

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
  const [bucketExists, setBucketExists] = useState(true);
  
  // Check if the 'profiles' bucket exists when component mounts
  useEffect(() => {
    async function checkBucket() {
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          console.error('Error checking buckets:', error);
          return;
        }
        
        const exists = buckets.some(bucket => bucket.name === 'profiles');
        setBucketExists(exists);
        
        if (!exists) {
          console.warn('Profiles bucket does not exist. Creating it...');
          // Try to create the bucket
          const { error: createError } = await supabase.storage.createBucket('profiles', {
            public: true, // Make files publicly accessible
            fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
          });
          
          if (createError) {
            console.error('Error creating profiles bucket:', createError);
          } else {
            setBucketExists(true);
          }
        }
      } catch (err) {
        console.error('Error in bucket check:', err);
      }
    }
    
    checkBucket();
  }, []);
  
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);
  
  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, GIF, WEBP)';
    }
    
    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'Image file is too large (max 5MB)';
    }
    
    return null;
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
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
    // Clear any previous error messages
    setMessage(null);
  };
  
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!profile) return null;
    
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a FormData for upload tracking
      const formData = new FormData();
      formData.append('file', file);
      
      // Check if bucket exists before attempting upload
      if (!bucketExists) {
        throw new Error('Storage bucket "profiles" does not exist');
      }
      
      // Upload the file with progress tracking
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
        } catch (uploadError: any) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
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
      await refreshProfile();
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
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
          <div className={`mb-4 p-3 rounded flex items-center ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}>
            <AlertCircle size={16} className="mr-2" />
            {message.text}
          </div>
        )}
        
        {!bucketExists && (
          <div className="mb-4 p-3 rounded bg-yellow-600 text-white flex items-center">
            <AlertCircle size={16} className="mr-2" />
            Storage not properly configured. Avatar uploads may not work.
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
            
            {isUploading && (
              <div className="w-full mt-2">
                <div className="w-full h-2 bg-gray-700 rounded-full mt-1">
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