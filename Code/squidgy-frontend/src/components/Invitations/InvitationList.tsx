// src/components/Invitations/InvitationList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../Auth/AuthProvider';
import { Check, X, Bell } from 'lucide-react';

interface Invitation {
  id: string;
  sender_id: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
  recipient_id: string;
  group_id?: string;
  group?: {
    name: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

const InvitationList: React.FC = () => {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    if (!profile) return;
    
    const fetchInvitations = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*, sender:sender_id(full_name, avatar_url), group:group_id(name)')
          .eq('recipient_id', profile.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setInvitations(data);
        setHasUnread(data.length > 0);
      } catch (error) {
        console.error('Error fetching invitations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvitations();
    
    // Set up real-time subscription for new invitations
    const subscription = supabase
      .channel('invitations_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invitations',
          filter: `recipient_id=eq.${profile.id}`
        },
        async (payload) => {
          // Fetch full invitation with sender and group info
          const { data } = await supabase
            .from('invitations')
            .select('*, sender:sender_id(full_name, avatar_url), group:group_id(name)')
            .eq('id', payload.new.id)
            .single();
            
          if (data) {
            setInvitations(prev => [data, ...prev]);
            setHasUnread(true);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);
  
  const handleInvitation = async (invitationId: string, accept: boolean) => {
    if (!profile) return;
    
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      
      if (!invitation) {
        console.error('Invitation not found');
        return;
      }
      
      // Update invitation status
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', invitationId);
        
      if (invitationError) throw invitationError;
      
      // If accepted and it's a group invitation, add user to the group
      if (accept && invitation.group_id) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: invitation.group_id,
            user_id: profile.id,
            role: 'member',
            is_agent: false
          });
          
        if (memberError) throw memberError;
      }
      
      // Update local state
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
      
      // Update unread status
      if (invitations.length <= 1) {
        setHasUnread(false);
      }
    } catch (error) {
      console.error('Error handling invitation:', error);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-400 hover:text-white rounded-full"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
        )}
      </button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-[#2D3B4F] rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-gray-700">
            <h3 className="font-bold text-white">Invitations</h3>
          </div>
          
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : invitations.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {invitations.map((invitation) => (
                <div 
                  key={invitation.id}
                  className="p-3 border-b border-gray-700 last:border-0"
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3 overflow-hidden">
                      {invitation.sender?.avatar_url ? (
                        <img 
                          src={invitation.sender.avatar_url} 
                          alt={invitation.sender.full_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{invitation.sender?.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white">
                        <span className="font-medium">{invitation.sender?.full_name || 'Someone'}</span> invited you to 
                        {invitation.group ? (
                          <span> join the group <span className="font-medium">{invitation.group.name}</span></span>
                        ) : (
                          ' a conversation'
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(invitation.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-2 space-x-2">
                    <button
                      onClick={() => handleInvitation(invitation.id, false)}
                      className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
                      title="Decline"
                    >
                      <X size={16} />
                    </button>
                    <button
                      onClick={() => handleInvitation(invitation.id, true)}
                      className="p-1 bg-green-600 hover:bg-green-700 text-white rounded-full"
                      title="Accept"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              No pending invitations
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvitationList;