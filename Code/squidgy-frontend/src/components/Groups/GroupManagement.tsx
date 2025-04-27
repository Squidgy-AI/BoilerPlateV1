// src/components/Groups/GroupManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../Auth/AuthProvider';
import { Users, UserPlus, UserMinus, Edit, Trash2, UserCheck, Settings } from 'lucide-react';

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  is_agent: boolean;
  agent_type?: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface GroupManagementProps {
  groupId: string;
  onClose: () => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ groupId, onClose }) => {
  const { profile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<any[]>([
    { id: 'agent1', name: 'Product Manager', avatar: '/seth.JPG', type: 'ProductManager' },
    { id: 'agent2', name: 'Pre-Sales Consultant', avatar: '/sol.jpg', type: 'PreSalesConsultant' },
    { id: 'agent3', name: 'Social Media Manager', avatar: '/sarah.jpg', type: 'SocialMediaManager' },
    { id: 'agent4', name: 'Lead Gen Specialist', avatar: '/james.jpg', type: 'LeadGenSpecialist' }
  ]);
  
  useEffect(() => {
    if (!groupId || !profile) return;
    
    const fetchGroupDetails = async () => {
      setIsLoading(true);
      
      try {
        // Fetch group details
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();
          
        if (groupError) throw groupError;
        
        setGroupName(groupData.name);
        
        // Fetch group members
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('*, user:user_id(full_name, avatar_url)')
          .eq('group_id', groupId);
          
        if (membersError) throw membersError;
        
        setMembers(membersData);
        
        // Check if current user is admin
        const currentUserMember = membersData.find(m => m.user_id === profile.id);
        setIsAdmin(currentUserMember?.role === 'admin');
      } catch (error) {
        console.error('Error fetching group details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [groupId, profile]);
  
  const handleUpdateGroupName = async () => {
    if (!groupId || !isAdmin || !groupName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: groupName.trim() })
        .eq('id', groupId);
        
      if (error) throw error;
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating group name:', error);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!groupId || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
      
      // Update local state
      setMembers(members.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };
  
  const handleChangeMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!groupId || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);
        
      if (error) throw error;
      
      // Update local state
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
    } catch (error) {
      console.error('Error changing member role:', error);
    }
  };
  
  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      // Search for users by name or email
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);
        
      if (error) throw error;
      
      // Filter out users who are already members
      const existingUserIds = members.map(m => m.user_id);
      const filteredResults = data.filter(user => !existingUserIds.includes(user.id));
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };
  
  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  const handleAddMembers = async () => {
    if (!groupId || !isAdmin || selectedUsers.length === 0) return;
    
    setIsAddingMembers(true);
    
    try {
      // Add selected users as members
      const newMembers = selectedUsers.map(userId => ({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        is_agent: false
      }));
      
      const { error } = await supabase
        .from('group_members')
        .insert(newMembers);
        
      if (error) throw error;
      
      // Fetch updated members to refresh the list
      const { data: updatedMembers, error: fetchError } = await supabase
        .from('group_members')
        .select('*, user:user_id(full_name, avatar_url)')
        .eq('group_id', groupId);
        
      if (fetchError) throw fetchError;
      
      setMembers(updatedMembers);
      setSelectedUsers([]);
      setShowAddMemberModal(false);
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setIsAddingMembers(false);
    }
  };
  
  const handleAddAgent = async (agentId: string, agentType: string) => {
    if (!groupId || !isAdmin) return;
    
    try {
      // Check if agent is already in group
      const agentExists = members.some(m => m.is_agent && m.agent_type === agentType);
      
      if (agentExists) {
        console.log('Agent already in group');
        return;
      }
      
      // Add agent to group
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: agentId,
          role: 'member',
          is_agent: true,
          agent_type: agentType
        });
        
      if (error) throw error;
      
      // Fetch updated members
      const { data: updatedMembers, error: fetchError } = await supabase
        .from('group_members')
        .select('*, user:user_id(full_name, avatar_url)')
        .eq('group_id', groupId);
        
      if (fetchError) throw fetchError;
      
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error adding agent:', error);
    }
  };
  
  const handleLeaveGroup = async () => {
    if (!groupId || !profile) return;
    
    if (isAdmin && members.filter(m => m.role === 'admin' && !m.is_agent).length <= 1) {
      alert('You are the only admin. Please assign another admin before leaving the group.');
      return;
    }
    
    if (confirm('Are you sure you want to leave this group?')) {
      try {
        const memberToRemove = members.find(m => m.user_id === profile.id);
        
        if (!memberToRemove) {
          console.error('Current user not found in group members');
          return;
        }
        
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('id', memberToRemove.id);
          
        if (error) throw error;
        
        onClose();
      } catch (error) {
        console.error('Error leaving group:', error);
      }
    }
  };
  
  const handleDeleteGroup = async () => {
    if (!groupId || !isAdmin) return;
    
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        // Delete group (cascade will delete all members and messages)
        const { error } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);
          
        if (error) throw error;
        
        onClose();
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Settings className="mr-2" size={20} />
            Group Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            &times;
          </button>
        </div>
        
        {/* Group Name */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-300 font-medium">Group Name</label>
            {isAdmin && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 bg-[#1E2A3B] text-white px-3 py-2 rounded-lg"
              />
              <button
                onClick={handleUpdateGroupName}
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="bg-[#1E2A3B] text-white px-3 py-2 rounded-lg">
              {groupName}
            </div>
          )}
        </div>
        
        {/* Members */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-300 font-medium">Members ({members.length})</h3>
            {isAdmin && (
              <button 
                onClick={() => setShowAddMemberModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg flex items-center"
              >
                <UserPlus size={16} className="mr-1" />
                Add Members
              </button>
            )}
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map((member) => (
              <div 
                key={member.id}
                className="flex items-center justify-between bg-[#1E2A3B] p-3 rounded-lg"
              >
                <div className="flex items-center">
                  {member.is_agent ? (
                    // Agent display
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-3">
                      <Users size={14} />
                    </div>
                  ) : (
                    // User avatar
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 overflow-hidden">
                      {member.user?.avatar_url ? (
                        <img 
                          src={member.user.avatar_url} 
                          alt={member.user.full_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{member.user?.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <div className="text-white">
                      {member.is_agent ? (
                        // Show agent name based on type
                        (() => {
                          const agent = availableAgents.find(a => a.type === member.agent_type);
                          return agent ? agent.name : 'AI Agent';
                        })()
                      ) : (
                        member.user?.full_name || 'Unknown User'
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center">
                      {member.role === 'admin' ? (
                        <>
                          <UserCheck size={12} className="mr-1" />
                          Admin
                        </>
                      ) : (
                        'Member'
                      )}
                      {member.is_agent && (
                        <span className="ml-2 text-purple-400">AI Agent</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isAdmin && member.user_id !== profile?.id && (
                  <div className="flex space-x-2">
                    {!member.is_agent && (
                      <button
                        onClick={() => handleChangeMemberRole(
                          member.id, 
                          member.role === 'admin' ? 'member' : 'admin'
                        )}
                        className="text-blue-400 hover:text-blue-300"
                        title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Remove from group"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Agents Section */}
        {isAdmin && (
          <div className="mb-6">
            <h3 className="text-gray-300 font-medium mb-2">Add AI Agents</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableAgents.map((agent) => {
                const isAdded = members.some(m => m.is_agent && m.agent_type === agent.type);
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleAddAgent(agent.id, agent.type)}
                    className={`flex items-center p-2 rounded-lg ${
                      isAdded 
                        ? 'bg-green-700 bg-opacity-30 cursor-default'
                        : 'bg-[#1E2A3B] hover:bg-[#2A3B4F] cursor-pointer'
                    }`}
                    disabled={isAdded}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                      <img 
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-white">{agent.name}</div>
                      {isAdded ? (
                        <span className="text-xs text-green-400">Added</span>
                      ) : (
                        <span className="text-xs text-gray-400">Add to group</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Group Actions */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between">
            <button
              onClick={handleLeaveGroup}
              className="text-red-400 hover:text-red-300 flex items-center"
            >
              <UserMinus size={16} className="mr-1" />
              Leave Group
            </button>
            
            {isAdmin && (
              <button
                onClick={handleDeleteGroup}
                className="text-red-400 hover:text-red-300 flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Delete Group
              </button>
            )}
          </div>
        </div>
        
        {/* Add Members Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Add Members</h3>
              
              <div className="mb-4">
                <div className="flex">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by name or email"
                    className="flex-1 bg-[#1E2A3B] text-white px-3 py-2 rounded-l-lg"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                  />
                  <button
                    onClick={handleSearchUsers}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-r-lg"
                  >
                    Search
                  </button>
                </div>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="mb-4 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center p-2 rounded-lg hover:bg-[#3D4B5F] cursor-pointer"
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => {}}
                        className="mr-3"
                      />
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 overflow-hidden">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.full_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{user.full_name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white">{user.full_name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="text-center text-gray-400 py-4">
                  No users found. Try a different search.
                </div>
              ) : null}
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSearchTerm('');
                    setSearchResults([]);
                    setSelectedUsers([]);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={selectedUsers.length === 0 || isAddingMembers}
                  className={`px-4 py-2 rounded-lg text-white flex items-center ${
                    selectedUsers.length === 0 || isAddingMembers
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isAddingMembers && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  )}
                  Add {selectedUsers.length} Member{selectedUsers.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManagement;