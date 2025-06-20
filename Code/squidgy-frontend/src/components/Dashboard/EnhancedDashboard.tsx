// src/components/Dashboard/EnhancedDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { AGENT_CONFIG } from '@/config/agents';
import { 
  User, 
  Users, 
  Bot, 
  MessageSquare, 
  Send, 
  Video, 
  Mic, 
  Settings, 
  LogOut, 
  UserPlus, 
  FolderPlus, 
  X,
  Code2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProfileSettings from '../ProfileSettings';
import GroupManagement from '../Groups/GroupManagement';
import InteractiveAvatar from '../InteractiveAvatar';
import WebSocketService from '@/services/WebSocketService';
import StreamingAvatar from "@heygen/streaming-avatar";
import WebSocketDebugger from '../WebSocketDebugger';
import AgentGreeting from '../AgentGreeting';
import SquidgyLogo from '../Auth/SquidgyLogo';
import MessageContent from '../Chat/MessageContent';

const EnhancedDashboard: React.FC = () => {
  type WebSocketLog = {
    timestamp: Date;
    type: 'info' | 'error' | 'success' | 'warning';
    message: string;
    data?: any;
  };
  const [websocketLogs, setWebsocketLogs] = useState<WebSocketLog[]>([]);
  const { profile, signOut, inviteUser } = useAuth();
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
  // const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('presaleskb');;
  const avatarRef = React.useRef<StreamingAvatar | null>(null);
  
  // Store session IDs for each agent to maintain continuity
  const [agentSessions, setAgentSessions] = useState<{[agentId: string]: string}>({});
  
  // Cache chat history for each agent for faster switching
  const [agentChatCache, setAgentChatCache] = useState<{[agentId: string]: any[]}>({});
  
// src/components/Dashboard/EnhancedDashboard.tsx
const agents = AGENT_CONFIG;
  
  // Initialize with first agent on mount
  useEffect(() => {
    const presalesAgent = agents.find(a => a.id === 'presaleskb') || agents[0];
    setSelectedAgent(presalesAgent);
    setCurrentSessionId(`${profile?.user_id}_${presalesAgent.id}`);
  }, [profile]);
  
  // Fetch people and groups
  useEffect(() => {
    if (profile) {
      fetchPeople();
      fetchGroups();
      initializeAgentSessions();
    }
  }, [profile]);
  
  // Initialize agent sessions on login
  const initializeAgentSessions = async () => {
    if (!profile) return;
    
    // For now, skip session persistence and just select the first agent
    // This ensures the app works even without the sessions table
    try {
      if (agents.length > 0 && !selectedAgent) { // Only initialize if no agent is selected
        const firstAgent = agents[0]; // Default to first agent (Pre-Sales Consultant)
        setSelectedAgent(firstAgent);
        setSelectedAvatarId(firstAgent.id);
        console.log(`Auto-selected default agent: ${firstAgent.name}`);
        
        // Load chat history for the default agent
        await loadChatHistoryForAgent(firstAgent);
      }
    } catch (error) {
      console.error('Error initializing agent sessions:', error);
    }
    
    // TODO: Uncomment this when sessions table is properly set up
    /*
    try {
      // Get the most recent session across all agents
      const { data: recentSession, error: sessionError } = await supabase
        .from('sessions')
        .select('*, agent_id')
        .eq('user_id', profile.user_id)
        .eq('is_group', false)
        .not('agent_id', 'is', null)
        .order('last_active', { ascending: false })
        .limit(1)
        .single();
        
      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('Error fetching recent session:', sessionError);
        return;
      }
      
      if (recentSession) {
        const agent = agents.find(a => a.id === recentSession.agent_id);
        if (agent) {
          await handleAgentSelect(agent);
          console.log(`Auto-loaded most recent session for agent: ${agent.name}`);
        }
      }
    } catch (error) {
      console.error('Error initializing agent sessions:', error);
    }
    */
  };
  
  // Connect WebSocket when session changes
  useEffect(() => {
    if (!profile || !currentSessionId) {
      // Clean up existing connection if no session
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }
      return;
    }
    
    // Add a small delay to prevent rapid connection creation/destruction
    const connectTimer = setTimeout(() => {
      // Disconnect existing WebSocket
      if (websocket) {
        websocket.close();
      }
      
      // Create new WebSocket connection
      const ws = new WebSocketService({
        userId: profile.user_id,
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
      
      ws.connect().catch(error => {
        console.error('Failed to connect WebSocket:', error);
        setConnectionStatus('disconnected');
      });
      
      setWebsocket(ws);
    }, 100); // Small delay to prevent rapid connections
    
    return () => {
      clearTimeout(connectTimer);
      if (websocket) {
        websocket.close();
      }
    };
  }, [profile, currentSessionId]);
  
  // Debug messages changes
  useEffect(() => {
    console.log('Messages state changed:', messages.length, 'messages for agent:', selectedAgent?.name);
    messages.forEach((msg, idx) => {
      console.log(`Message ${idx}:`, msg.sender, '-', msg.text.substring(0, 50));
    });
  }, [messages, selectedAgent]);
  
  const fetchPeople = async () => {
    if (!profile) return;
    
    try {
      // Use the secure user_connections view to only get people you're connected to
      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .order('full_name');
        
      if (error) {
        console.error('Error fetching connected people:', error);
        setPeople([]);
        return;
      }
      
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
      setPeople([]);
    }
  };
  
  const fetchGroups = async () => {
    if (!profile) return;
    
    // Get groups where the current user is a member
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', profile.user_id);
      
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
    
    // Only log important WebSocket events
    if (data.type === 'error' || data.type === 'connection_status') {
      setWebsocketLogs(prev => [...prev, {
        timestamp: new Date(),
        type: data.type === 'error' ? 'error' : 'info',
        message: `WebSocket: ${data.message || data.type}`,
        data: data
      }]);
    }
    
    switch (data.type) {
      case 'agent_thinking':
        setAgentThinking(`${data.agent} is thinking...`);
        break;
        
      case 'agent_response':
        if (data.final) {
          setAgentThinking(null);
          const agentMessage = { 
            sender: 'agent', 
            text: data.message,
            timestamp: new Date().toISOString()
          };
          console.log('Received agent response:', agentMessage);
          
          // Only log if there's an error or important state
          if (data.error) {
            setWebsocketLogs(prev => [...prev, {
              timestamp: new Date(),
              type: 'error',
              message: `Agent error: ${data.error}`,
              data: data
            }]);
          }
          
          addMessage(agentMessage);
          
          // Save agent message to database
          if (currentSessionId) {
            saveMessageToDatabase(agentMessage.text, agentMessage.sender);
          }
          
          // Speak with avatar if enabled
          if (avatarRef.current && videoEnabled && voiceEnabled) {
            avatarRef.current.speak({
              text: data.message,
              taskType: "talk" as any,
              taskMode: 1 as any
            });
          }
        }
        break;
        
      case 'error':
        setWebsocketLogs(prev => [...prev, {
          timestamp: new Date(),
          type: 'error',
          message: `Error: ${data.message}`,
          data: data
        }]);
        break;
    }
  };
  
  const handleSessionSelect = (sessionId: string, isGroup: boolean = false) => {
    setCurrentSessionId(sessionId);
    setIsGroupSession(isGroup);
    setMessages([]); // Clear messages for new session
  };
  
  // const handleNewSession = () => {
  // // Don't automatically select an agent - let user choose
  // setCurrentSessionId('');
  // setSelectedAgent(null);
  // setIsGroupSession(false);
  // setMessages([]);
  // setActiveSection('agents'); // Switch to agents tab so user can select
  // };

  const handleNewSession = async () => {
    if (activeSection === 'agents' && selectedAgent) {
      try {
        // Create new session with currently selected agent
        const newSessionId = `${profile?.user_id}_${selectedAgent.id}_${Date.now()}`;
        
        // Update the agent's session ID to the new one
        setAgentSessions(prev => ({ ...prev, [selectedAgent.id]: newSessionId }));
        setCurrentSessionId(newSessionId);
        setIsGroupSession(false);
        setMessages([]);
        // Clear cache for this agent since it's a new session
        setAgentChatCache(prev => ({ ...prev, [selectedAgent.id]: [] }));
        
        // Close any existing avatar streaming session
        if (websocket) {
          websocket.close();
        }
        
        console.log(`New chat session created for agent: ${selectedAgent.name}`);
      } catch (error) {
        console.error('Error in handleNewSession:', error);
      }
    } else {
      // No agent selected, switch to agents tab
      setCurrentSessionId('');
      setSelectedAgent(null);
      setSelectedAvatarId('');
      setIsGroupSession(false);
      setMessages([]);
      setActiveSection('agents');
    }
  };
  
  const handleAgentSelect = async (agent: any) => {
    try {
      setSelectedAgent(agent);
      setSelectedAvatarId(agent.id);
      setIsGroupSession(false);
      
      // Close any existing avatar streaming session
      if (websocket) {
        websocket.close();
      }
      
      // Get or create a persistent session ID for this agent
      let sessionId = agentSessions[agent.id];
      if (!sessionId) {
        sessionId = `${profile?.user_id}_${agent.id}_${Date.now()}`;
        setAgentSessions(prev => ({ ...prev, [agent.id]: sessionId }));
      }
      setCurrentSessionId(sessionId);
      
      // Check if we have cached messages for this agent first
      if (agentChatCache[agent.id]) {
        console.log(`Loading ${agentChatCache[agent.id].length} cached messages for agent: ${agent.name}`);
        setMessages(agentChatCache[agent.id]);
      } else {
        console.log(`No cached messages found for agent: ${agent.name}, loading from database...`);
        // Load chat history from database for this specific agent session
        await loadChatHistoryForAgent(agent);
      }
      
      console.log(`Selected agent: ${agent.name}, Session: ${sessionId}`);
      
      // TODO: Uncomment when sessions table is available
      /*
      // Find the latest session for this agent
      const { data: latestSession, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', profile?.user_id)
        .eq('agent_id', agent.id)
        .eq('is_group', false)
        .order('last_active', { ascending: false })
        .limit(1)
        .single();
        
      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('Error fetching latest session:', sessionError);
        return;
      }
      
      if (latestSession) {
        // Load existing session
        setCurrentSessionId(latestSession.id);
        
        // Load chat history for this session
        const { data: chatHistory, error: historyError } = await supabase
          .from('chat_history')
          .select('*')
          .eq('session_id', latestSession.id)
          .order('timestamp', { ascending: true });
          
        if (historyError) {
          console.error('Error loading chat history:', historyError);
        } else {
          const formattedMessages = chatHistory.map(msg => ({
            id: msg.id,
            sender: msg.sender,
            text: msg.message,
            timestamp: msg.timestamp
          }));
          setMessages(formattedMessages);
        }
        
        // Update session last_active timestamp
        await supabase
          .from('sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('id', latestSession.id);
          
        console.log(`Loaded session for agent: ${agent.name}, Messages: ${chatHistory?.length || 0}`);
      } else {
        // No existing session, clear messages but don't create a new session yet
        setCurrentSessionId('');
        setMessages([]);
        console.log(`No existing session for agent: ${agent.name}`);
      }
      */
    } catch (error) {
      console.error('Error in handleAgentSelect:', error);
    }
  };
  
  const saveMessageToDatabase = async (message: string, sender: string) => {
    if (!currentSessionId || !profile) {
      console.log('Cannot save message - missing session or profile:', { currentSessionId, profile: !!profile });
      return;
    }
    
    try {
      console.log('Saving message to database:', { message: message.substring(0, 50), sender, currentSessionId });
      
      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: profile.user_id,
          session_id: currentSessionId,
          sender: sender,
          message: message,
          timestamp: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving message to database:', error);
        setWebsocketLogs(prev => [...prev, {
          timestamp: new Date(),
          type: 'error',
          message: `Database error: ${error.message}`,
          data: error
        }]);
      }
    } catch (error) {
      console.error('Error in saveMessageToDatabase:', error);
    }
  };
  
  // Function to load chat history for a specific agent from database
  const loadChatHistoryForAgent = async (agent: any) => {
    if (!profile?.user_id) return;
    
    try {
      console.log(`Loading chat history from database for agent: ${agent.name}`);
      
      // Get all chat history for this user and agent combination
      const { data: chatHistory, error: historyError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', profile.user_id)
        .ilike('session_id', `%_${agent.id}_%`) // Match any session with this agent
        .order('timestamp', { ascending: true });
        
      if (historyError) {
        console.error('Error loading chat history:', historyError);
        setMessages([]);
        setAgentChatCache(prev => ({ ...prev, [agent.id]: [] }));
      } else if (chatHistory && chatHistory.length > 0) {
        const formattedMessages = chatHistory.map(msg => ({
          id: msg.id,
          sender: msg.sender,
          text: msg.message,
          timestamp: msg.timestamp
        }));
        setMessages(formattedMessages);
        // Cache the messages for this agent
        setAgentChatCache(prev => ({ ...prev, [agent.id]: formattedMessages }));
        console.log(`Loaded ${chatHistory.length} messages for agent: ${agent.name}`);
      } else {
        setMessages([]);
        setAgentChatCache(prev => ({ ...prev, [agent.id]: [] }));
        console.log(`No previous messages found for agent: ${agent.name}`);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
      setAgentChatCache(prev => ({ ...prev, [agent.id]: [] }));
    }
  };
  
  // Helper function to add a message and update cache
  const addMessage = (message: any) => {
    console.log('Adding message:', message, 'for agent:', selectedAgent?.name);
    setMessages(prev => {
      const newMessages = [...prev, message];
      console.log('Messages after adding:', newMessages.length);
      // Update cache for current agent
      if (selectedAgent) {
        setAgentChatCache(prevCache => ({ 
          ...prevCache, 
          [selectedAgent.id]: newMessages 
        }));
      }
      return newMessages;
    });
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || !websocket || !selectedAgent) {
      console.log('Cannot send message:', { inputMessage: inputMessage.trim(), websocket: !!websocket, selectedAgent: !!selectedAgent });
      return;
    }
    
    // Use the agent's persistent session, or create one if it doesn't exist
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = agentSessions[selectedAgent.id];
      if (!sessionId) {
        sessionId = `${profile?.user_id}_${selectedAgent.id}_${Date.now()}`;
        setAgentSessions(prev => ({ ...prev, [selectedAgent.id]: sessionId }));
      }
      setCurrentSessionId(sessionId);
      console.log(`Using session for agent: ${selectedAgent.name}`);
    }
    
    const userMessage = inputMessage.trim();
    console.log('Sending message:', userMessage, 'Session ID:', sessionId);
    
    // Add user message to UI and cache
    addMessage({ sender: 'user', text: userMessage, timestamp: new Date().toISOString() });
    
    // Save user message to database (chat_history should work)
    await saveMessageToDatabase(userMessage, 'user');
    
    // Send via WebSocket
    console.log('WebSocket status:', websocket.getStatus(), 'Connection state:', connectionStatus);
    
    try {
      await websocket.sendMessage(userMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      setWebsocketLogs(prev => [...prev, {
        timestamp: new Date(),
        type: 'error',
        message: `Failed to send message: ${error}`,
        data: error
      }]);
    }
    
    setInputMessage('');
    setAgentThinking('AI is thinking...');
  };
  
  const handleAvatarReady = () => {
    console.log("Avatar is ready");
  };
  
  const handleInviteUser = async () => {
    if (!profile || !inviteEmail) return;
    
    // setIsLoading(true);
    
    try {
      console.log('Inviting:', inviteEmail);
      
      // Call the actual inviteUser function from AuthProvider
      const result = await inviteUser(inviteEmail);
      
      console.log('Invitation result:', result);
      
      if (result.status === 'success') {
        alert(`✅ ${result.message}`);
      } else if (result.status === 'partial_success') {
        // Show manual link option
        const shouldCopy = confirm(`⚠️ ${result.message}\n\nClick OK to copy the email to clipboard.`);
        if (shouldCopy) {
          navigator.clipboard.writeText(inviteEmail).then(() => {
            alert('Link copied to clipboard!');
          }).catch(() => {
            alert('Failed to copy link. Please copy manually.');
          });
        }
      } else {
        alert(`❌ ${result.message}`);
      }
      
      setInviteEmail('');
      setShowAddPeopleModal(false);
      fetchPeople();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      // setIsLoading(false);
    }
  };
  
  const handleCreateGroup = async () => {
    if (!profile || !newGroupName) return;
    
    // setIsLoading(true);
    
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName,
          created_by: profile.user_id
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
      // setIsLoading(false);
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
            <SquidgyLogo width={32} className="mr-2" />
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
            onClick={() => setShowDebugConsole(!showDebugConsole)}
            className={`p-2 hover:bg-gray-700 rounded transition-colors ${
              showDebugConsole ? 'bg-gray-700 text-green-400' : 'text-gray-400'
            }`}
            title="Toggle WebSocket Debug Console"
          >
            <Code2 size={20} />
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
                  onClick={() => handleAgentSelect(agent)}
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
                      const target = e.target as HTMLImageElement;
                      target.src = agent.fallbackAvatar || '/avatars/default-agent.jpg';
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
                  <div className="mt-4">
                    {selectedAgent && (
                      <AgentGreeting 
                        agentId={selectedAgent.id} 
                        className="mb-4"
                      />
                    )}
                    <div className="text-center text-gray-400 mt-6">
                      Start a conversation...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show agent greeting as first message */}
                    {selectedAgent && (
                      <AgentGreeting 
                        agentId={selectedAgent.id} 
                        className="mb-4"
                      />
                    )}
                    {messages.map((msg, index) => (
                      <div
                        key={`${msg.timestamp}-${index}`}
                        className={`mb-4 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                      >
                        <div className={`inline-block p-3 rounded-2xl max-w-[80%] ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-green-600 text-white rounded-bl-sm'
                        }`}>
                          <MessageContent 
                            text={msg.text} 
                            isUser={msg.sender === 'user'}
                          />
                        </div>
                        <div className={`text-xs text-gray-400 mt-1 ${
                          msg.sender === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Message Input Area */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex items-end">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#1B2431] text-white placeholder:text-gray-400 px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[42px] max-h-[120px] overflow-y-auto border border-gray-600"
                    disabled={!textEnabled}
                    rows={1}
                    style={{
                      height: 'auto',
                      minHeight: '42px',
                      lineHeight: '1.5'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!textEnabled}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors disabled:opacity-50 min-h-[42px] flex items-center border border-l-0 border-gray-600"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WebSocket Debug Console */}
          {showDebugConsole && (
            <div className="border-t border-gray-700">
              <WebSocketDebugger 
                websocket={websocket?.rawWebSocket || null} 
                status={connectionStatus} 
                logs={websocketLogs}
                className="bg-black"
              />
            </div>
          )}
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