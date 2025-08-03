// src/components/Sidebar/EnhancedSidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useChat } from '@/context/ChatContext';
import { supabase } from '@/lib/supabase';
import { getEnabledAgents, restoreAgentEnabledStatus } from '@/config/agents';
import { Users, User, Bot, UserPlus, FolderPlus, LogOut, Settings, MessageSquare, Search, X } from 'lucide-react';
import InvitationList from '../Invitations/InvitationList';

interface SidebarProps {
  onSettingsOpen: () => void;
}

const EnhancedSidebar: React.FC<SidebarProps> = ({ onSettingsOpen }) => {
  const { profile, signOut, sendInvitation } = useAuth();
  const { 
    currentSessionId, 
    setCurrentSessionId, 
    isGroupSession,
    setIsGroupSession, 
    clearSessionMessages,
    fetchSessionMessages,
    createNewSession
  } = useChat();
  
  const [activeSection, setActiveSection] = useState<'people' | 'agents' | 'groups'>('agents');
  const [people, setPeople] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentUpdateTrigger, setAgentUpdateTrigger] = useState(0);
  
  // States for modals
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch people and groups
  useEffect(() => {
    if (profile) {
      fetchPeople();
      fetchInvitations();
      fetchGroups();
      
      // Set up real-time subscription for profile changes
      const profileSubscription = supabase
        .channel('profiles_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `company_id=eq.${profile.company_id}`
          },
          (payload) => {
            console.log('Profile change detected:', payload);
            // Refresh people list when profiles change
            fetchPeople();
            fetchInvitations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profileSubscription);
      };
    }
  }, [profile]);
  
  // Load enabled agents and restore from localStorage
  useEffect(() => {
    // Restore agent enabled status from localStorage
    restoreAgentEnabledStatus();
    
    // Load enabled agents
    const enabledAgents = getEnabledAgents();
    setAgents(enabledAgents);
    
    console.log('Loaded enabled agents:', enabledAgents);
  }, [agentUpdateTrigger]);
  
  // Listen for storage changes to update agents when they're enabled
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('agent_') && e.key.endsWith('_enabled')) {
        console.log('Agent enabled status changed, refreshing agents list');
        setAgentUpdateTrigger(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also set up a custom event listener for same-window updates
    const handleAgentUpdate = () => {
      console.log('Agent update event received, refreshing agents list');
      setAgentUpdateTrigger(prev => prev + 1);
    };
    
    window.addEventListener('agentUpdated', handleAgentUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('agentUpdated', handleAgentUpdate);
    };
  }, []);
  
  // Combine people and invitations for display
  const combinedPeople = [
    ...people.map(person => ({ ...person, type: 'profile', status: 'accepted' })),
    ...invitations.map(inv => ({ 
      ...inv, 
      type: 'invitation', 
      full_name: inv.recipient_email?.split('@')[0] || 'Pending User',
      email: inv.recipient_email,
      status: inv.status || 'pending'
    }))
  ];

  // Filter combined people based on search term
  const filteredPeople = searchTerm 
    ? combinedPeople.filter(person => 
        person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : combinedPeople;
    
  // Filter groups based on search term
  const filteredGroups = searchTerm
    ? groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : groups;
  
  // Fetch people from database - only show people from same company
  const fetchPeople = async () => {
    try {
      if (!profile?.company_id) {
        console.log('No company_id found for current user, showing empty people list');
        setPeople([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id)  // Only show people from same company
        .neq('user_id', profile?.user_id || '')  // Exclude current user
        .order('full_name');
        
      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} people in company ${profile.company_id}`);
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
      setPeople([]);
    }
  };

  // Fetch invitations from database - only show invitations sent by current user or to same company
  const fetchInvitations = async () => {
    try {
      if (!profile?.user_id) {
        console.log('No user_id found for current user, showing empty invitations list');
        setInvitations([]);
        return;
      }

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .or(`sender_id.eq.${profile.user_id},sender_company_id.eq.${profile.company_id}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} invitations for company ${profile.company_id}`);
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    }
  };
  
  // Fetch groups from database
  const fetchGroups = async () => {
    try {
      // Get groups where the current user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', profile?.id || '');
        
      if (memberError) throw memberError;
      
      const groupIds = memberData.map(item => item.group_id);
      
      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }
      
      // Get group details
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };
  
  // Invite a user
  const handleInviteUser = async () => {
    if (!profile || !sendInvitation) return;
    
    setIsLoading(true);
    
    try {
      // Use the proper sendInvitation function from AuthProvider
      // which handles both database creation AND email sending
      await sendInvitation(inviteEmail);
      
      setInviteEmail('');
      setShowAddPeopleModal(false);
      
      alert(`Invitation sent to ${inviteEmail}`);
      
      // Refresh people and invitations list
      fetchPeople();
      fetchInvitations();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert(`Error inviting user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new group
  const handleCreateGroup = async () => {
    if (!profile || !newGroupName.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          created_by: profile.id
        })
        .select()
        .single();
        
      if (groupError || !groupData) throw groupError || new Error('Failed to create group');
      
      // Add the creator to the group as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: profile.id,
          role: 'admin',
          is_agent: false
        });
        
      if (memberError) throw memberError;
      
      // Add selected members to the group
      for (const memberId of selectedMembers) {
        await supabase
          .from('group_members')
          .insert({
            group_id: groupData.id,
            user_id: memberId,
            role: 'member',
            is_agent: false
          });
      }
      
      // Add selected agents to the group
      for (const agentId of selectedAgents) {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
          await supabase
            .from('group_members')
            .insert({
              group_id: groupData.id,
              user_id: agentId,
              role: 'member',
              is_agent: true,
              agent_type: agent.type
            });
        }
      }
      
      // Reset state
      setNewGroupName('');
      setSelectedMembers([]);
      setSelectedAgents([]);
      setShowCreateGroupModal(false);
      
      // Refresh groups
      fetchGroups();
      
      // Select the new group
      handleSessionSelect(groupData.id, true);
    } catch (error) {
      console.error('Error creating group:', error);
      alert(`Error creating group: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle session selection
  const handleSessionSelect = async (sessionId: string, isGroup: boolean = false) => {
    if (sessionId === currentSessionId && isGroup === isGroupSession) return;
    
    // Clear current messages
    clearSessionMessages();
    
    // Set new session
    setCurrentSessionId(sessionId);
    setIsGroupSession(isGroup);
    
    // Fetch messages for the session
    await fetchSessionMessages(sessionId, isGroup);
  };
  
  // Handle creating a new session with an agent
  const handleNewAgentSession = async () => {
    try {
      const newSessionId = await createNewSession();
      handleSessionSelect(newSessionId, false);
    } catch (error) {
      console.error('Error creating new session:', error);
      alert('Error creating new session');
    }
  };
  
  // Toggle member selection
  const toggleMemberSelection = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };
  
  // Toggle agent selection
  const toggleAgentSelection = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter(a => a !== id));
    } else {
      setSelectedAgents([...selectedAgents, id]);
    }
  };
  
  // Search for users
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  return (
    <div className="w-full h-full bg-[#1B2431] text-white flex flex-col">
      {/* User Info Section */}
      <div className="p-4 flex items-center border-b border-gray-700">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{profile?.full_name?.charAt(0) || 'U'}</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{profile?.full_name || 'User'}</h3>
          <p className="text-xs text-gray-400">{profile?.email || ''}</p>
        </div>
        <div className="flex space-x-2">
          <InvitationList />
          <button 
            onClick={onSettingsOpen}
            className="text-gray-400 hover:text-white p-2 rounded-full"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={() => signOut()}
            className="text-gray-400 hover:text-white p-2 rounded-full"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full bg-[#2D3B4F] text-white pl-10 pr-4 py-2 rounded-lg"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Section Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveSection('people')}
          className={`flex-1 py-3 text-center text-sm ${
            activeSection === 'people' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'
          }`}
        >
          <User size={16} className="inline mr-1" />
          People
        </button>
        <button
          onClick={() => setActiveSection('agents')}
          className={`flex-1 py-3 text-center text-sm ${
            activeSection === 'agents' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'
          }`}
        >
          <Bot size={16} className="inline mr-1" />
          Agents
        </button>
        <button
          onClick={() => setActiveSection('groups')}
          className={`flex-1 py-3 text-center text-sm ${
            activeSection === 'groups' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'
          }`}
        >
          <Users size={16} className="inline mr-1" />
          Groups
        </button>
      </div>
      
      {/* Action Buttons */}
      <div className="p-3 border-b border-gray-700">
        {activeSection === 'people' && (
          <button
            onClick={() => setShowAddPeopleModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center"
          >
            <UserPlus size={16} className="mr-2" />
            Invite People
          </button>
        )}
        
        {activeSection === 'groups' && (
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center"
          >
            <FolderPlus size={16} className="mr-2" />
            Create Group
          </button>
        )}
        
        {activeSection === 'agents' && (
          <button
            onClick={handleNewAgentSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center"
          >
            <MessageSquare size={16} className="mr-2" />
            New Chat
          </button>
        )}
      </div>
      
      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeSection === 'people' && (
          <div className="space-y-2">
            {filteredPeople.length > 0 ? (
              filteredPeople.map(person => (
                <div 
                  key={`${person.type}-${person.id || person.token}`}
                  className={`p-2 rounded-lg hover:bg-[#2D3B4F] flex items-center ${
                    person.type === 'profile' 
                      ? `cursor-pointer ${currentSessionId === person.id && !isGroupSession ? 'bg-[#2D3B4F]' : ''}`
                      : person.status === 'pending' 
                        ? 'bg-yellow-900/20 border-l-2 border-yellow-500' 
                        : 'bg-red-900/20 border-l-2 border-red-500'
                  }`}
                  onClick={() => person.type === 'profile' && handleSessionSelect(person.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 overflow-hidden ${
                    person.type === 'profile' ? 'bg-gray-600' : 
                    person.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    {person.type === 'profile' && person.avatar_url ? (
                      <img 
                        src={person.avatar_url} 
                        alt={person.full_name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-white">
                        {person.type === 'invitation' ? 
                          (person.status === 'pending' ? '⏳' : person.status === 'expired' ? '❌' : '📧') : 
                          (person.full_name?.charAt(0) || 'U')
                        }
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{person.full_name}</div>
                      {person.type === 'invitation' && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          person.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          person.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          person.status === 'expired' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {person.status === 'pending' ? 'Pending' : 
                           person.status === 'accepted' ? 'Accepted' : 
                           person.status === 'expired' ? 'Expired' : 
                           person.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {person.email}
                      {person.type === 'invitation' && person.created_at && (
                        <span className="ml-2">
                          • Sent {new Date(person.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                {searchTerm ? 'No people matching your search' : 'No people added yet'}
              </div>
            )}
          </div>
        )}
        
        {activeSection === 'agents' && (
          <div className="space-y-2">
            {agents.map(agent => (
              <div 
                key={agent.id}
                className={`p-2 rounded-lg hover:bg-[#2D3B4F] cursor-pointer ${
                  currentSessionId === agent.id && !isGroupSession ? 'bg-[#2D3B4F]' : ''
                }`}
                onClick={() => handleSessionSelect(agent.id)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                    <img 
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback for image loading errors
                        const target = e.target as HTMLImageElement;
                        target.src = '/avatars/fallback-avatar.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-gray-400 truncate">{agent.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activeSection === 'groups' && (
          <div className="space-y-2">
            {filteredGroups.length > 0 ? (
              filteredGroups.map(group => (
                <div 
                  key={group.id}
                  className={`p-2 rounded-lg hover:bg-[#2D3B4F] cursor-pointer ${
                    currentSessionId === group.id && isGroupSession ? 'bg-[#2D3B4F]' : ''
                  }`}
                  onClick={() => handleSessionSelect(group.id, true)}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                      <Users size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-gray-400">Created {new Date(group.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                {searchTerm ? 'No groups matching your search' : 'No groups created yet'}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Add People Modal */}
      {showAddPeopleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Invite People</h3>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
                placeholder="Enter email address"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddPeopleModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={isLoading || !inviteEmail.includes('@')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create New Group</h3>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-3 bg-[#1E2A3B] text-white rounded-md"
                placeholder="Enter group name"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Add People</label>
              <div className="max-h-40 overflow-y-auto bg-[#1E2A3B] rounded-md">
                {people.length > 0 ? (
                  people.map(person => (
                    <div 
                      key={person.id}
                      className="p-2 hover:bg-[#374863] flex items-center cursor-pointer"
                      onClick={() => toggleMemberSelection(person.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedMembers.includes(person.id)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                        {person.avatar_url ? (
                          <img 
                            src={person.avatar_url} 
                            alt={person.full_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs">{person.full_name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <span className="text-sm">{person.full_name}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-400">No people available</div>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Add Agents</label>
              <div className="max-h-40 overflow-y-auto bg-[#1E2A3B] rounded-md">
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    className="p-2 hover:bg-[#374863] flex items-center cursor-pointer"
                    onClick={() => toggleAgentSelection(agent.id)}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                      <img 
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = agent.fallbackAvatar || '/avatars/default-agent.jpg';
                        }}
                      />
                    </div>
                    <span className="text-sm">{agent.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isLoading || !newGroupName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSidebar;