// src/components/Dashboard/EnhancedDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { 
  User, 
  Users, 
  Bot, 
  MessageSquare, 
  Send, 
  Video, 
  Mic, 
  ChevronDown, 
  ChevronUp, 
  Code2, 
  Settings, 
  LogOut, 
  UserPlus, 
  FolderPlus, 
  X, 
  PlusCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProfileSettings from '../ProfileSettings';
import GroupManagement from '../Groups/GroupManagement';
import InteractiveAvatar from '../InteractiveAvatar';
import WebSocketService from '@/services/WebSocketService';
import StreamingAvatar from "@heygen/streaming-avatar";
import WebSocketDebugger from '../WebSocketDebugger';

const EnhancedDashboard: React.FC = () => {
  type WebSocketLog = {
    timestamp: Date;
    type: 'info' | 'error' | 'success' | 'warning';
    message: string;
    data?: any;
  };
  const [websocketLogs, setWebsocketLogs] = useState<WebSocketLog[]>([]);
  const { profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<'people' | 'agents' | 'groups'>('agents');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [textEnabled, setTextEnabled] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [websocket, setWebsocket] = useState<WebSocketService | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState('Anna_public_3_20240108');
  const avatarRef = React.useRef<StreamingAvatar | null>(null);
  
  const agents = [
    { 
      id: 'agent1', 
      name: 'Product Manager', 
      avatar: '/seth.JPG', 
      type: 'ProductManager',
      avatarId: 'Anna_public_3_20240108'
    },
    { 
      id: 'agent2', 
      name: 'Pre-Sales Consultant', 
      avatar: '/sol.jpg', 
      type: 'PreSalesConsultant',
      avatarId: 'sol'
    },
    { 
      id: 'agent3', 
      name: 'Social Media Manager', 
      avatar: '/sarah.jpg', 
      type: 'SocialMediaManager',
      avatarId: 'Anna_public_3_20240108'
    },
    { 
      id: 'agent4', 
      name: 'Lead Gen Specialist', 
      avatar: '/james.jpg', 
      type: 'LeadGenSpecialist',
      avatarId: 'sol'
    }
  ];
  
  // Initialize with first agent on mount
  useEffect(() => {
    setSelectedAgent(agents[0]);
    setCurrentSessionId(`${profile?.id}_${agents[0].id}`);
  }, [profile]);
  
  // Fetch people and groups
  useEffect(() => {
    if (profile) {
      fetchPeople();
      fetchGroups();
    }
  }, [profile]);
  
  // Connect WebSocket when session changes
  useEffect(() => {
    if (!profile || !currentSessionId) return;
    
    // Disconnect existing WebSocket
    if (websocket) {
      websocket.close();
    }
    
    // Create new WebSocket connection
    const ws = new WebSocketService({
      userId: profile.id,
      sessionId: currentSessionId,
      onStatusChange: setConnectionStatus,
      onMessage: handleWebSocketMessage,
      onLog: (log) => {
        setWebsocketLogs(prev => [...prev, {
          timestamp: new Date(),
          type: log.type,
          message: log.message,
          data: log.data
        }].slice(-100));
      }
    });
    
    ws.connect();
    setWebsocket(ws);
    
    return () => {
      ws.close();
    };
  }, [profile, currentSessionId]);
  
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
  
  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket message:', data);
    
    switch (data.type) {
      case 'agent_thinking':
        setAgentThinking(`${data.agent} is thinking...`);
        break;
        
      case 'agent_response':
        if (data.final) {
          setAgentThinking(null);
          setMessages(prev => [...prev, { 
            sender: 'agent', 
            text: data.message 
          }]);
          
          // Speak with avatar if enabled
          if (avatarRef.current && videoEnabled && voiceEnabled) {
            avatarRef.current.speak({
              text: data.message,
              taskType: "REPEAT",
              taskMode: "SYNC"
            });
          }
        }
        break;
    }
  };
  
  const handleSessionSelect = (sessionId: string, isGroup: boolean = false) => {
    setCurrentSessionId(sessionId);
    setIsGroupSession(isGroup);
    setMessages([]); // Clear messages for new session
  };
  
  const handleNewSession = () => {
    // Create new session with default agent
    const newSessionId = `${profile?.id}_${agents[0].id}`;
    setCurrentSessionId(newSessionId);
    setSelectedAgent(agents[0]);
    setIsGroupSession(false);
    setMessages([]);
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || !websocket) return;
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: inputMessage.trim() }]);
    
    // Send via WebSocket
    await websocket.sendMessage(inputMessage.trim());
    
    setInputMessage('');
    setAgentThinking('AI is thinking...');
  };
  
  const handleAvatarReady = () => {
    console.log("Avatar is ready");
  };
  
  const handleInviteUser = async () => {
    if (!profile || !inviteEmail) return;
    
    setIsLoading(true);
    
    try {
      // Simplified invitation logic
      console.log('Inviting:', inviteEmail);
      setInviteEmail('');
      setShowAddPeopleModal(false);
      fetchPeople();
    } catch (error) {
      console.error('Error inviting user:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateGroup = async () => {
    if (!profile || !newGroupName) return;
    
    setIsLoading(true);
    
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
      
      // Add members and agents...
      // Reset state
      setNewGroupName('');
      setSelectedMembers([]);
      setSelectedAgents([]);
      setShowCreateGroupModal(false);
      fetchGroups();
      handleSessionSelect(groupData.id, true);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-[#1B2431] text-white">
      {/* Top Header Bar */}
      <div className="h-14 bg-[#2D3B4F] border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded mr-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
              <span className="text-lg font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold">Squidgy</h1>
          </div>
          <div className="ml-4 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className={`text-sm px-2 py-1 rounded ${
              connectionStatus === 'connected' ? 'bg-green-600' : 
              connectionStatus === 'connecting' ? 'bg-yellow-600' : 'bg-red-600'
            } text-white`}>
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleNewSession}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <PlusCircle size={16} className="mr-2" />
            New Chat
          </button>
          <button 
            onClick={() => setShowProfileSettings(true)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => signOut()} 
            className="p-2 hover:bg-gray-700 rounded"
          >
            <LogOut size={20} />
          </button>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name || 'User'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold">{profile?.full_name?.charAt(0) || 'U'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Collapsible */}
        <div className={`bg-[#1E2A3B] border-r border-gray-700 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}>
          {/* User Profile Section */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name || 'User'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold">{profile?.full_name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{profile?.email || ''}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
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

          {/* Action Buttons based on active section */}
          <div className="p-3">
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
                onClick={handleNewSession}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center"
              >
                <MessageSquare size={16} className="mr-2" />
                New Chat
              </button>
            )}
          </div>

          {/* Content List */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* People List */}
            {activeSection === 'people' && (
              <div>
                {people.length > 0 ? (
                  people.map(person => (
                    <div
                      key={person.id}
                      onClick={() => handleSessionSelect(person.id)}
                      className={`p-2 rounded mb-2 cursor-pointer flex items-center hover:bg-[#2D3B4F]/50 ${
                        currentSessionId === person.id ? 'bg-[#2D3B4F]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-600 mr-2 flex items-center justify-center">
                        <span className="text-sm">{person.full_name?.charAt(0) || 'U'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{person.full_name}</p>
                        <p className="text-xs text-gray-400">{person.email}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    No people added yet
                  </div>
                )}
              </div>
            )}
            
            {/* Agents List */}
            {activeSection === 'agents' && agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent);
                  setSelectedAvatarId(agent.avatarId);
                  handleSessionSelect(`${profile?.id}_${agent.id}`);
                }}
                className={`p-2 rounded mb-2 cursor-pointer flex items-center ${
                  selectedAgent?.id === agent.id ? 'bg-[#2D3B4F]' : 'hover:bg-[#2D3B4F]/50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 mr-2 overflow-hidden">
                  <img 
                    src={agent.avatar}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/fallback-avatar.jpg';
                    }}
                  />
                </div>
                <span className="text-sm">{agent.name}</span>
              </div>
            ))}
            
            {/* Groups List */}
            {activeSection === 'groups' && (
              <div>
                {groups.length > 0 ? (
                  groups.map(group => (
                    <div
                      key={group.id}
                      onClick={() => handleSessionSelect(group.id, true)}
                      className={`p-2 rounded mb-2 cursor-pointer flex items-center hover:bg-[#2D3B4F]/50 ${
                        currentSessionId === group.id ? 'bg-[#2D3B4F]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-600 mr-2 flex items-center justify-center">
                        <Users size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{group.name}</p>
                        <p className="text-xs text-gray-400">Group chat</p>
                      </div>
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
        </div>

        {/* Main Content - Center and Right */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header Bar */}
          <div className="h-14 bg-[#2D3B4F] border-b border-gray-700 flex items-center justify-between px-6">
            <h2 className="text-lg font-semibold">{selectedAgent?.name || 'Select an Agent'}</h2>
            
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTextEnabled(!textEnabled)}
                className={`p-2 rounded ${textEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <MessageSquare size={16} />
              </button>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-2 rounded ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <Mic size={16} />
              </button>
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-2 rounded ${videoEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <Video size={16} />
              </button>
            </div>
          </div>

          {/* Main Content with Animation and Chat */}
          <div className="flex-1 flex overflow-hidden">
            {/* Animation/Avatar Area */}
            <div className="flex-1 bg-[#1B2431] p-6">
              <div className="h-full rounded-lg bg-[#2D3B4F] flex items-center justify-center relative">
                {videoEnabled ? (
                  <>
                    <InteractiveAvatar
                      onAvatarReady={handleAvatarReady}
                      avatarRef={avatarRef}
                      enabled={videoEnabled}
                      sessionId={currentSessionId}
                      voiceEnabled={voiceEnabled}
                      avatarId={selectedAvatarId}
                    />
                    
                    {/* Fallback when avatar is loading */}
                    {!avatarRef.current && (
                      <div className="text-center">
                        <div className="w-64 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <span className="text-8xl">🤖</span>
                        </div>
                        <div className="animate-pulse text-xl text-blue-400">
                          Loading avatar...
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-400">Video is disabled</div>
                )}
                
                {agentThinking && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                      {agentThinking}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="w-96 bg-[#2D3B4F] flex flex-col">
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    Start a conversation...
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      <div className={`inline-block p-3 rounded-2xl max-w-[80%] ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-700 text-white rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <div className={`text-xs text-gray-400 mt-1 ${
                        msg.sender === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input Area */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#1B2431] text-white px-4 py-2 rounded-l-lg focus:outline-none"
                    disabled={!textEnabled}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!textEnabled}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WebSocket Debug Console */}
          <div className="border-t border-gray-700">
            <WebSocketDebugger 
              websocket={websocket?.ws || null} 
              status={connectionStatus} 
              logs={websocketLogs}
              className="bg-black"
            />
          </div>
        </div>
      </div>
      
      {/* Add People Modal */}
      {showAddPeopleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2D3B4F] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Invite People</h3>
              <button 
                onClick={() => setShowAddPeopleModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create New Group</h3>
              <button 
                onClick={() => setShowCreateGroupModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
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
            
            {/* Add People to Group */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Add People</label>
              <div className="max-h-40 overflow-y-auto bg-[#1E2A3B] rounded-md">
                {people.map(person => (
                  <div 
                    key={person.id}
                    className="p-2 hover:bg-[#374863] flex items-center cursor-pointer"
                    onClick={() => {
                      if (selectedMembers.includes(person.id)) {
                        setSelectedMembers(selectedMembers.filter(id => id !== person.id));
                      } else {
                        setSelectedMembers([...selectedMembers, person.id]);
                      }
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedMembers.includes(person.id)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                      <span className="text-xs">{person.full_name?.charAt(0) || 'U'}</span>
                    </div>
                    <span className="text-sm">{person.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Add Agents to Group */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Add Agents</label>
              <div className="max-h-40 overflow-y-auto bg-[#1E2A3B] rounded-md">
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    className="p-2 hover:bg-[#374863] flex items-center cursor-pointer"
                    onClick={() => {
                      if (selectedAgents.includes(agent.id)) {
                        setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                      } else {
                        setSelectedAgents([...selectedAgents, agent.id]);
                      }
                    }}
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
                        onError={(e) => {
                          e.currentTarget.src = '/fallback-avatar.jpg';
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <ProfileSettings 
          isOpen={showProfileSettings} 
          onClose={() => setShowProfileSettings(false)} 
        />
      )}
      
      {/* Group Management Modal */}
      {showGroupManagement && currentSessionId && isGroupSession && (
        <GroupManagement 
          groupId={currentSessionId}
          onClose={() => setShowGroupManagement(false)}
        />
      )}
    </div>
  );
};

export default EnhancedDashboard;