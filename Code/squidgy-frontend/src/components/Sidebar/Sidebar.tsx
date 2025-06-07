// src/components/Sidebar/Sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { User, Users, Bot, UserPlus, FolderPlus, LogOut, Settings, MessageSquare } from 'lucide-react';
import { Profile, Group, GroupMember } from '@/lib/supabase';
import { AGENT_CONFIG } from '@/config/agents';

interface SidebarProps {
  onSessionSelect: (sessionId: string, isGroup?: boolean) => void;
  onNewSession: () => void;
  currentSessionId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onSessionSelect, 
  onNewSession,
  currentSessionId
}) => {
  const { profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<'people' | 'agents' | 'groups'>('people');
  const [people, setPeople] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [agents, setAgents] = useState<any[]>(AGENT_CONFIG);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  // Fetch people and groups
  useEffect(() => {
    if (profile) {
      fetchPeople();
      fetchGroups();
    }
  }, [profile]);
  
  const fetchPeople = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile.id);
      
    if (!error && data) {
      setPeople(data);
    }
  };
  
  const fetchGroups = async () => {
    if (!profile) return;
    
    // Get groups where the current user is a member
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', profile.id);
      
    if (memberError || !memberData) return;
    
    const groupIds = memberData.map(item => item.group_id);
    
    if (groupIds.length === 0) return;
    
    // Get group details
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);
      
    if (!error && data) {
      setGroups(data);
    }
  };
  
  const handleInviteUser = async () => {
    try {
      // This is a simplified version - in a real app, you'd send an email with a link
      await supabase.auth.admin.inviteUserByEmail(inviteEmail);
      setInviteEmail('');
      setShowAddPeopleModal(false);
      // Refresh the people list
      fetchPeople();
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };
  
  const handleCreateGroup = async () => {
    if (!profile || !newGroupName) return;
    
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName,
          created_by: profile.id
        })
        .select()
        .single();
        
      if (groupError || !groupData) throw groupError;
      
      // Add the creator to the group
      await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: profile.id,
          role: 'admin',
          is_agent: false
        });
        
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
      
      // Reset state and refresh groups
      setNewGroupName('');
      setSelectedMembers([]);
      setSelectedAgents([]);
      setShowCreateGroupModal(false);
      fetchGroups();
      
      // Select the newly created group
      onSessionSelect(groupData.id, true);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };
  
  const toggleMemberSelection = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };
  
  const toggleAgentSelection = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter(a => a !== id));
    } else {
      setSelectedAgents([...selectedAgents, id]);
    }
  };
  
  return (
    <div className="w-full h-full bg-[#1B2431] text-white flex flex-col">
      {/* User Info Section */}
      <div className="p-4 flex items-center border-b border-gray-700">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{profile?.full_name?.charAt(0) || 'U'}</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{profile?.full_name || 'User'}</h3>
          <p className="text-xs text-gray-400">{profile?.email || ''}</p>
        </div>
        <button 
          onClick={() => signOut()}
          className="text-gray-400 hover:text-white p-2"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
      
      {/* Section Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveSection('people')}
          className={`flex-1 py-3 text-center text-sm ${
            activeSection === 'people' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'
          }`}
        >
          <Users size={16} className="inline mr-1" />
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center"
          >
            <UserPlus size={16} className="mr-2" />
            Invite People
          </button>
        )}
        
        {activeSection === 'groups' && (
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center"
          >
            <FolderPlus size={16} className="mr-2" />
            Create Group
          </button>
        )}
        
        {activeSection === 'agents' && (
          <button
            onClick={onNewSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center"
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
            {people.length > 0 ? (
              people.map(person => (
                <div 
                  key={person.id}
                  className="p-2 rounded-lg hover:bg-[#2D3B4F] cursor-pointer flex items-center"
                  onClick={() => onSessionSelect(person.id)}
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    {person.avatar_url ? (
                      <img 
                        src={person.avatar_url} 
                        alt={person.full_name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{person.full_name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <span>{person.full_name}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No people added yet
              </div>
            )}
          </div>
        )}
        
        {activeSection === 'agents' && (
          <div className="space-y-2">
            {agents.map(agent => (
              <div 
                key={agent.id}
                className="p-2 rounded-lg hover:bg-[#2D3B4F] cursor-pointer flex items-center"
                onClick={() => onSessionSelect(agent.id)}
              >
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                  <img 
                    src={agent.avatar}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span>{agent.name}</span>
              </div>
            ))}
          </div>
        )}
        
        {activeSection === 'groups' && (
          <div className="space-y-2">
            {groups.length > 0 ? (
              groups.map(group => (
                <div 
                  key={group.id}
                  className={`p-2 rounded-lg hover:bg-[#2D3B4F] cursor-pointer flex items-center ${
                    currentSessionId === group.id ? 'bg-[#2D3B4F]' : ''
                  }`}
                  onClick={() => onSessionSelect(group.id, true)}
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                    <Users size={16} />
                  </div>
                  <span>{group.name}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No groups created yet
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
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
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                        <span>{person.full_name?.charAt(0) || 'U'}</span>
                      </div>
                      <span>{person.full_name}</span>
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
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                      <img 
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span>{agent.name}</span>
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;