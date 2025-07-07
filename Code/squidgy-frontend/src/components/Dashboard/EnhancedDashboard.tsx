// src/components/Dashboard/EnhancedDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { getUserAgents, getEnabledAgents, updateAgentEnabledStatus, getAgentSetup, checkSOLAgentEnabled, initializePersonalAssistant, enableSOLAgent } from '@/services/agentService';
import type { Agent } from '@/services/agentService';
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
  Code2,
  Sun
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
import EnableAgentPrompt from '../EnableAgentPrompt';
import CompleteBusinessSetup from '../CompleteBusinessSetup';
import ChatHistory from '../ChatHistory';
import ProgressiveSOLSetup from '../ProgressiveSOLSetup';
import { SolarBusinessConfig } from '@/config/solarBusinessConfig';
import { getUserId } from '@/utils/getUserId';

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
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('PersonalAssistant');;
  const avatarRef = React.useRef<StreamingAvatar | null>(null);
  
  // Store session IDs for each agent to maintain continuity
  // Initialize agentSessions from localStorage to persist across refreshes
  const [agentSessions, setAgentSessions] = useState<{[agentId: string]: string}>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentSessions');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Store last 2 sessions per agent for session history
  const [agentSessionHistory, setAgentSessionHistory] = useState<{[agentId: string]: string[]}>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentSessionHistory');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  // Cache chat history for each agent for faster switching - persist to localStorage
  const [agentChatCache, setAgentChatCache] = useState<{[agentId: string]: any[]}>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentChatCache');
      const parsed = saved ? JSON.parse(saved) : {};
      console.log('🔍 CACHE INIT - Raw localStorage value:', saved);
      console.log('🔍 CACHE INIT - Parsed cache:', parsed);
      console.log('🔍 CACHE INIT - Loaded from localStorage:', Object.keys(parsed).map(key => `${key}: ${parsed[key].length} messages`));
      return parsed;
    }
    return {};
  });

  // Helper function to update agentSessions and persist to localStorage
  const updateAgentSessions = (updater: (prev: {[agentId: string]: string}) => {[agentId: string]: string}) => {
    setAgentSessions(prev => {
      const updated = updater(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem('agentSessions', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Helper function to update agentSessionHistory and persist to localStorage
  const updateAgentSessionHistory = (updater: (prev: {[agentId: string]: string[]}) => {[agentId: string]: string[]}) => {
    setAgentSessionHistory(prev => {
      const updated = updater(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem('agentSessionHistory', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Helper function to update agentChatCache and persist to localStorage
  const updateAgentChatCache = (updater: (prev: {[agentId: string]: any[]}) => {[agentId: string]: any[]}) => {
    setAgentChatCache(prev => {
      const updated = updater(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem('agentChatCache', JSON.stringify(updated));
        console.log('🔄 CACHE UPDATED - Saved to localStorage:', Object.keys(updated).map(key => `${key}: ${updated[key].length} messages`));
      }
      return updated;
    });
  };

  // Function to start a new chat session (clear current and create fresh session)
  const startNewChat = () => {
    if (selectedAgent && profile?.user_id) {
      // Save current session to history before creating new one
      const currentSessionId = agentSessions[selectedAgent.id];
      if (currentSessionId) {
        updateAgentSessionHistory(prev => {
          const currentHistory = prev[selectedAgent.id] || [];
          // Keep only last 2 sessions (current becomes previous, new becomes current)
          const newHistory = [currentSessionId, ...currentHistory].slice(0, 2);
          return { ...prev, [selectedAgent.id]: newHistory };
        });
      }
      
      // Create a new session ID with current timestamp
      const newSessionId = `${profile.user_id}_${selectedAgent.id}_${Date.now()}`;
      
      // Update the agent's session ID
      updateAgentSessions(prev => ({ ...prev, [selectedAgent.id]: newSessionId }));
      setCurrentSessionId(newSessionId);
      
      // Clear current messages and cache for this agent
      setMessages([]);
      updateAgentChatCache(prev => ({ ...prev, [selectedAgent.id]: [] }));
      
      console.log(`🆕 Started new chat session: ${newSessionId} for agent: ${selectedAgent.name}`);
      console.log(`📚 Session history for ${selectedAgent.name}:`, agentSessionHistory[selectedAgent.id] || []);
    }
  };
  
  // Agent enabling functionality
  const [showEnableAgentPrompt, setShowEnableAgentPrompt] = useState<{show: boolean, agentId: string, agentName: string}>({
    show: false,
    agentId: '',
    agentName: ''
  });
  const [chatDisabled, setChatDisabled] = useState(false);
  
  // SOL Agent progressive setup state  
  const [showSOLSetup, setShowSOLSetup] = useState(false);

  // DEBUG: Monitor showSOLSetup state changes
  useEffect(() => {
    console.log('🔔 showSOLSetup state changed:', showSOLSetup);
    console.log('🔔 Current selectedAgent:', selectedAgent?.id);
  }, [showSOLSetup, selectedAgent?.id]);
  
  // Chat history functionality
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  // Website analysis loading states
  const [websiteAnalysisLoading, setWebsiteAnalysisLoading] = useState({
    detecting: false,
    screenshot: false,
    favicon: false,
    analysis: false
  });
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
// src/components/Dashboard/EnhancedDashboard.tsx
const [agents, setAgents] = useState<Agent[]>([]);
const [allAgents, setAllAgents] = useState<Agent[]>([]);
const [agentUpdateTrigger, setAgentUpdateTrigger] = useState(0);
  
  // Load agents from database and initialize
  useEffect(() => {
    if (!profile) return;
    
    const initializeAgents = async () => {
      await loadAgentsFromDatabase();
    };
    
    initializeAgents();
  }, [profile]);

  const loadAgentsFromDatabase = async () => {
    try {
      // Initialize PersonalAssistant (always available)
      await initializePersonalAssistant();
      
      // Load all agents and enabled agents
      const [allUserAgents, enabledAgents] = await Promise.all([
        getUserAgents(),
        getEnabledAgents()
      ]);
      
      console.log('🔍 Agent loading debug:');
      console.log('Current user:', profile?.user_id);
      console.log('All user agents:', allUserAgents.map(a => ({ id: a.id, name: a.name, enabled: a.enabled })));
      console.log('Enabled agents:', enabledAgents.map(a => ({ id: a.id, name: a.name, enabled: a.enabled })));
      console.log('SOL Agent in all agents:', allUserAgents.find(a => a.id === 'SOLAgent'));
      console.log('SOL Agent in enabled agents:', enabledAgents.find(a => a.id === 'SOLAgent'));
      
      // Special debugging for your user ID
      if (profile?.user_id === '80b957fc-de1d-4f28-920c-41e0e2e28e5e') {
        console.log('🎯 SPECIAL DEBUG for user 80b957fc-de1d-4f28-920c-41e0e2e28e5e:');
        console.log('- Total agents loaded:', allUserAgents.length);
        console.log('- Enabled agents count:', enabledAgents.length);
        console.log('- SOL Agent present in all:', !!allUserAgents.find(a => a.id === 'SOLAgent'));
        console.log('- SOL Agent enabled value:', allUserAgents.find(a => a.id === 'SOLAgent')?.enabled);
        console.log('- SOL Agent in enabled list:', !!enabledAgents.find(a => a.id === 'SOLAgent'));
        console.log('- ALL AGENTS RAW DATA:', allUserAgents);
        console.log('- ENABLED AGENTS RAW DATA:', enabledAgents);
      }
      
      setAllAgents(allUserAgents);
      
      // Ensure critical agents are always available
      let finalEnabledAgents = [...enabledAgents];
      
      // Always include PersonalAssistant
      const personalAssistant = allUserAgents.find(a => a.id === 'PersonalAssistant');
      if (personalAssistant && !finalEnabledAgents.find(a => a.id === 'PersonalAssistant')) {
        console.log('🔄 Adding PersonalAssistant to enabled agents (always available)');
        finalEnabledAgents.push(personalAssistant);
      }
      
      // AGGRESSIVE FIX: Ensure SOL Agent appears if it's enabled in database
      const solAgent = allUserAgents.find(a => a.id === 'SOLAgent');
      if (solAgent && solAgent.enabled && !finalEnabledAgents.find(a => a.id === 'SOLAgent')) {
        console.log('🔥 FORCING SOL Agent to appear - was missing from enabled list!');
        console.log('SOL Agent data:', solAgent);
        finalEnabledAgents.push(solAgent);
      }
      
      console.log('Final enabled agents:', finalEnabledAgents.map(a => ({ id: a.id, name: a.name, enabled: a.enabled })));
      console.log('🎯 UI will show these agents:', finalEnabledAgents.map(a => a.id));
      setAgents(finalEnabledAgents);
      
      // Try to restore last selected agent from localStorage
      const lastSelectedAgentId = localStorage.getItem('selectedAgentId');
      let agentToSelect;
      
      if (lastSelectedAgentId) {
        agentToSelect = enabledAgents.find(a => a.id === lastSelectedAgentId);
        console.log(`🔄 Restoring agent from localStorage: ${lastSelectedAgentId}`, agentToSelect ? 'Found and enabled' : 'Not found or disabled');
      }
      
      // Fallback to first enabled agent if no stored agent or agent not found/disabled
      if (!agentToSelect && enabledAgents.length > 0) {
        agentToSelect = enabledAgents.find(a => a.id === 'PersonalAssistant') || enabledAgents[0];
        console.log(`🔄 Using fallback enabled agent: ${agentToSelect?.id}`);
      }
      
      if (agentToSelect) {
        console.log(`✅ Initialized with agent: ${agentToSelect.id}, avatar: ${agentToSelect.id}, session: ${profile.user_id}_${agentToSelect.id}`);
        // Call handleAgentSelect to properly load cached messages and set up the agent
        await handleAgentSelect(agentToSelect);
      }
    } catch (error) {
      console.error('Error loading agents from database:', error);
    }
  };

  // Safety sync: Ensure avatar ID always matches selected agent
  useEffect(() => {
    if (selectedAgent && selectedAvatarId !== selectedAgent.id) {
      console.log(`🔧 Avatar sync: ${selectedAvatarId} → ${selectedAgent.id}`);
      setSelectedAvatarId(selectedAgent.id);
    }
  }, [selectedAgent, selectedAvatarId]);
  
  // SOL Agent now uses simple enable/disable - no progressive setup checking needed
  useEffect(() => {
    console.log('🔍 Agent selection effect triggered:', {
      selectedAgentId: selectedAgent?.id,
      selectedAgentName: selectedAgent?.name
    });
    
    // No special setup handling needed - SOL Agent works like any other agent
  }, [selectedAgent]);
  
  // Removed automatic onboarding - ProgressiveSOLSetup already works properly when SOL Agent is manually enabled
  
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
        const firstAgent = agents[0]; // Default to first agent (Personal Assistant Bot)
        setSelectedAgent(firstAgent);
        setSelectedAvatarId(firstAgent.id);
        console.log(`Auto-selected default agent: ${firstAgent.name}`);
        
        // Get or create a persistent session ID for this agent
        let sessionId = agentSessions[firstAgent.id];
        if (!sessionId) {
          sessionId = `${profile.user_id}_${firstAgent.id}_${Date.now()}`;
          updateAgentSessions(prev => ({ ...prev, [firstAgent.id]: sessionId }));
        }
        
        // Load chat history for the default agent with specific session
        await loadChatHistoryForAgent(firstAgent, sessionId, true);
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
  
  const handleWebSocketMessage = async (data: any) => {
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
        
      case 'agent_switch':
        // Handle explicit agent switch message from backend
        console.log('🔄 Agent switch message received:', data);
        const fromAgent = data.from_agent;
        const toAgent = data.to_agent;
        const switchMessage = data.message;
        
        // Find the target agent
        const newAgent = agents.find(agent => agent.agent_name === toAgent || agent.id === toAgent);
        if (newAgent) {
          console.log(`🔄 Switching from ${fromAgent} to ${toAgent}`);
          
          // Save current messages to cache before switching
          if (selectedAgent && messages.length > 0) {
            console.log(`💾 Saving ${messages.length} messages to cache for agent: ${selectedAgent.name}`);
            updateAgentChatCache(prevCache => ({ 
              ...prevCache, 
              [selectedAgent.id]: [...messages] 
            }));
          }
          
          await handleAgentSelect(newAgent);
          
          // Show the switch message
          if (switchMessage) {
            addMessage({
              sender: 'agent',
              text: switchMessage,
              timestamp: new Date().toISOString()
            });
            
            // Agent message will be saved by backend - no need to save here
          }
        }
        break;
        
      case 'agent_response':
        if (data.final) {
          setAgentThinking(null);
          setIsSendingMessage(false);
          // Clear website analysis loading states when response is complete
          setWebsiteAnalysisLoading({
            detecting: false,
            screenshot: false,
            favicon: false,
            analysis: false
          });
          
          // Check for agent switching scenario
          const responseAgentName = data.agent_name || data.agent; // Backend sends 'agent' field
          const outputAction = data.output_action;
          const agentResponse = data.agent_response || data.message;
          const currentAgentId = selectedAgent?.id;
          const currentAgentName = selectedAgent?.agent_name || selectedAgent?.id;
          
          // Check if the response contains agent enabling request
          const solAgentEnablePattern = /(enable|activate).*(SOL Agent|Solar)/i;
          if (solAgentEnablePattern.test(agentResponse)) {
            console.log('🤖 SOL Agent enable request detected');
            setShowEnableAgentPrompt({
              show: true,
              agentId: 'SOLAgent',
              agentName: 'SOL Agent'
            });
            setChatDisabled(true);
          }
          
          console.log('🔄 Agent response processing:', {
            currentAgentId,
            currentAgentName,
            responseAgentName,
            outputAction,
            agentResponse,
            fullData: data
          });
          
          // Handle agent switching when the response comes from a different agent
          if (responseAgentName && responseAgentName !== currentAgentName) {
            console.log('🔄 Agent routing detected - checking for agent switch');
            console.log(`Current agent: ${currentAgentName}, Response from: ${responseAgentName}`);
            console.log('Available agents:', agents.map(a => ({ id: a.id, agent_name: a.agent_name, name: a.name })));
            
            // Find the target agent by agent_name
            const targetAgent = agents.find(agent => agent.agent_name === responseAgentName);
            
            if (targetAgent && targetAgent.id !== currentAgentId) {
              console.log(`🔄 Switching from ${currentAgentId} to ${targetAgent.id} (${targetAgent.name})`);
              
              // Save current messages to cache before switching (excluding this response)
              if (selectedAgent && messages.length > 0) {
                console.log(`💾 Saving ${messages.length} messages to cache for agent: ${selectedAgent.name}`);
                updateAgentChatCache(prevCache => ({ 
                  ...prevCache, 
                  [selectedAgent.id]: [...messages] 
                }));
              }
              
              // Switch to the target agent tab
              await handleAgentSelect(targetAgent);
              
              // Add a small delay to ensure the agent switch is complete
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Show transition message from the new agent
              const transitionMessage = {
                sender: 'agent',
                text: `Hey, I'm ${targetAgent.name} and I'll be better able to help you with this. ${agentResponse}`,
                timestamp: new Date().toISOString()
              };
              
              addMessage(transitionMessage);
              
              // Agent message will be saved by backend - no need to save here
              
              // Speak with avatar if enabled
              if (avatarRef.current && videoEnabled && voiceEnabled) {
                try {
                  avatarRef.current.speak({
                    text: transitionMessage.text,
                    taskType: "talk" as any,
                    taskMode: 1 as any
                  });
                } catch (error) {
                  console.error('Error speaking with avatar:', error);
                }
              }
              
              return; // Exit early since we handled the switch
            } else if (targetAgent && targetAgent.id === currentAgentId) {
              console.log('🔄 Same agent - showing normal response');
              // Same agent, just show the response normally
            } else {
              console.log('🔄 Target agent not found:', responseAgentName);
            }
          }
          
          // Normal agent response handling
          const agentMessage = { 
            sender: 'agent', 
            text: agentResponse,
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
          
          // Agent message will be saved by backend - no need to save here
          
          // Speak with avatar if enabled
          if (avatarRef.current && videoEnabled && voiceEnabled) {
            try {
              avatarRef.current.speak({
                text: agentResponse,
                taskType: "talk" as any,
                taskMode: 1 as any
              });
            } catch (error) {
              console.error('Error speaking with avatar:', error);
            }
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
        // Create new session with currently selected agent using our persistent startNewChat function
        startNewChat();
        
        setIsGroupSession(false);
        
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
    console.log('🚀 handleAgentSelect CALLED with agent:', agent?.id, agent?.name);
    
    try {
      // Prevent rapid switching by checking if we're already on this agent
      if (selectedAgent?.id === agent.id) {
        console.log(`🔄 Already on agent ${agent.id}, skipping switch`);
        
        // Special case: If SOL Agent is already selected, ensure setup is shown
        if (agent.id === 'SOLAgent') {
          console.log('🌞 SOL Agent already selected, ensuring setup is shown...');
          setShowSOLSetup(true);
        }
        return;
      }
      
      console.log(`🔄 Switching to agent: ${agent.name} (${agent.id})`);
      
      // Cache current messages before switching
      if (selectedAgent && messages.length > 0) {
        console.log(`💾 Caching ${messages.length} messages for agent: ${selectedAgent.name}`);
        updateAgentChatCache(prev => ({ ...prev, [selectedAgent.id]: [...messages] }));
      }
      
      // Update states immediately to prevent race conditions
      setSelectedAgent(agent);
      setSelectedAvatarId(agent.id);
      setIsGroupSession(false);
      
      // Clear any browser caching for avatar switching
      if (typeof window !== 'undefined') {
        // Force component re-render by clearing any cached avatar data
        localStorage.removeItem(`avatar_cache_${agent.id}`);
        console.log(`🗑️ Cleared avatar cache for ${agent.id}`);
      }
      
      // Save selected agent to localStorage for persistence across tab switches
      localStorage.setItem('selectedAgentId', agent.id);
      console.log(`💾 Saved agent to localStorage: ${agent.id}`);
      
      // Close any existing avatar streaming session gracefully
      if (websocket) {
        try {
          websocket.close();
        } catch (error) {
          console.log('Websocket already closed or error closing:', error);
        }
      }
      
      // Get or create a persistent session ID for this agent
      let sessionId = agentSessions[agent.id];
      if (!sessionId) {
        sessionId = `${profile?.user_id}_${agent.id}_${Date.now()}`;
        updateAgentSessions(prev => ({ ...prev, [agent.id]: sessionId }));
      }
      setCurrentSessionId(sessionId);
      
      // Check if we have cached messages for this agent first (faster UX)
      console.log('🔍 AGENT SELECT - Checking cache for agent:', agent.id, agent.name);
      console.log('🔍 AGENT SELECT - Available cache keys:', Object.keys(agentChatCache));
      console.log('🔍 AGENT SELECT - Cache for this agent:', agentChatCache[agent.id]?.length || 0, 'messages');
      
      const cachedMessages = agentChatCache[agent.id];
      console.log(`🔍 AGENT SELECT - agentChatCache state:`, agentChatCache);
      console.log(`🔍 AGENT SELECT - Cached messages for ${agent.id}:`, cachedMessages);
      console.log(`🔍 AGENT SELECT - Cached messages length:`, cachedMessages?.length || 0);
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log(`⚡ AGENT SELECT - Loading ${cachedMessages.length} cached messages for agent: ${agent.name}`);
        setMessages(cachedMessages);
        
        // Still load from database in background to sync any new messages, but don't clear cache
        console.log(`🔄 AGENT SELECT - Loading database messages in background for sync...`);
        loadChatHistoryForAgent(agent, sessionId, false); // false = don't clear messages if database is empty
      } else {
        console.log(`🔍 AGENT SELECT - No cached messages found for agent: ${agent.name}, loading from database...`);
        // Only clear messages if we truly have no cache
        setMessages([]);
        // Load chat history from database for this specific agent session
        await loadChatHistoryForAgent(agent, sessionId, true); // true = clear messages if database is empty
      }
      
      console.log(`✅ Selected agent: ${agent.name}, Session: ${sessionId}`);
      
      // Check if this is the Solar Sales Specialist and show setup if needed
      // SOL Agent no longer needs special setup handling
      console.log('🤖 Agent selected:', agent.name);
      
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
      
      // For SOL Agent, check if setup is incomplete and show ProgressiveSOLSetup
      if (agent.id === 'SOLAgent') {
        console.log('🌞 SOL Agent selected, checking setup status...');
        console.log('🔧 Setting showSOLSetup to true');
        setShowSOLSetup(true);
        
        // Also ensure we have a valid session for the setup
        if (!currentSessionId) {
          console.log('🔧 No current session, creating one for SOL Agent...');
          const newSessionId = `sol_session_${Date.now()}`;
          setCurrentSessionId(newSessionId);
        }
      } else {
        console.log('🔧 Setting showSOLSetup to false for agent:', agent.id);
        setShowSOLSetup(false);
      }
    } catch (error) {
      console.error('Error in handleAgentSelect:', error);
    }
  };
  
  // Database saves are handled by backend during WebSocket processing
  // No need for frontend database saves to avoid duplicate 409 conflicts
  
  // Function to load chat history for a specific agent session from database
  const loadChatHistoryForAgent = async (agent: any, sessionId?: string, clearIfEmpty: boolean = true) => {
    if (!profile?.user_id) return;
    
    try {
      console.log(`Loading chat history from database for agent: ${agent.name}, session: ${sessionId}`);
      
      // Get user_id from profiles table for proper querying
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        return;
      }

      // Get all chat history (both user and agent messages) for this specific agent
      let query = supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userIdResult.user_id)
        .eq('agent_id', agent.id)
        .order('timestamp', { ascending: true });
      
      // If we have a specific session ID, use it; otherwise get last 2 sessions for this agent
      if (sessionId) {
        const sessionHistory = agentSessionHistory[agent.id] || [];
        const relevantSessions = [sessionId, ...sessionHistory].slice(0, 2);
        if (relevantSessions.length > 0) {
          query = query.in('session_id', relevantSessions);
        }
      }
      
      const { data: chatHistory, error: historyError } = await query;
        
      if (historyError) {
        console.error('Error loading chat history:', historyError);
        if (clearIfEmpty) {
          setMessages([]);
          updateAgentChatCache(prev => ({ ...prev, [agent.id]: [] }));
        }
      } else if (chatHistory && chatHistory.length > 0) {
        const formattedMessages = chatHistory.map(msg => ({
          id: msg.id,
          sender: msg.sender,
          text: msg.message,
          timestamp: msg.timestamp
        }));
        
        // Count user vs agent messages for debugging
        const userMessages = formattedMessages.filter(msg => msg.sender === 'user').length;
        const agentMessages = formattedMessages.filter(msg => msg.sender === 'agent').length;
        
        setMessages(formattedMessages);
        // Cache the messages for this agent
        updateAgentChatCache(prev => ({ ...prev, [agent.id]: formattedMessages }));
        console.log(`✅ LOAD DB - Loaded ${chatHistory.length} messages for agent: ${agent.name} (${userMessages} user, ${agentMessages} agent)`);
      } else {
        // No database messages found - this is normal for new sessions
        console.log(`📭 LOAD DB - No previous messages found for agent: ${agent.name} session: ${sessionId}`);
        
        // Only clear if explicitly requested (clearIfEmpty = true)
        if (clearIfEmpty) {
          // Check if we have cached messages that should be displayed instead
          if (agentChatCache[agent.id] && agentChatCache[agent.id].length > 0) {
            console.log(`⚡ LOAD DB - Using cached messages instead: ${agentChatCache[agent.id].length} messages`);
            setMessages(agentChatCache[agent.id]);
          } else {
            setMessages([]);
            updateAgentChatCache(prev => ({ ...prev, [agent.id]: [] }));
          }
        } else {
          console.log(`🔄 LOAD DB - Background sync: Database empty, keeping existing messages`);
        }
      }
    } catch (error) {
      console.error('❌ LOAD DB - Error loading chat history:', error);
      
      // Fallback to cached messages if database fails
      if (clearIfEmpty) {
        if (agentChatCache[agent.id] && agentChatCache[agent.id].length > 0) {
          console.log(`⚡ LOAD DB - Database failed, using cached messages: ${agentChatCache[agent.id].length} messages`);
          setMessages(agentChatCache[agent.id]);
        } else {
          setMessages([]);
          updateAgentChatCache(prev => ({ ...prev, [agent.id]: [] }));
        }
      } else {
        console.log(`🔄 LOAD DB - Database failed during background sync, keeping existing messages`);
      }
    }
  };
  
  // Helper function to add a message and update cache
  const addMessage = (message: any) => {
    console.log('📝 ADD MESSAGE - Adding message:', message);
    console.log('📝 ADD MESSAGE - Current selectedAgent:', selectedAgent?.id, selectedAgent?.name);
    console.log('📝 ADD MESSAGE - Current sessionId:', currentSessionId);
    setMessages(prev => {
      const newMessages = [...prev, message];
      console.log('📝 ADD MESSAGE - Total messages after adding:', newMessages.length);
      // Update cache for current agent
      if (selectedAgent) {
        console.log('📝 ADD MESSAGE - Updating cache for agent:', selectedAgent.id);
        updateAgentChatCache(prevCache => ({ 
          ...prevCache, 
          [selectedAgent.id]: newMessages 
        }));
      } else {
        console.warn('⚠️ ADD MESSAGE - No selectedAgent, cannot update cache');
      }
      return newMessages;
    });
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || !websocket || !selectedAgent || isSendingMessage) {
      console.log('Cannot send message:', { inputMessage: inputMessage.trim(), websocket: !!websocket, selectedAgent: !!selectedAgent, isSendingMessage });
      return;
    }
    
    setIsSendingMessage(true);
    
    // Use the agent's persistent session, or create one if it doesn't exist
    let sessionId = currentSessionId;
    console.log('💬 SEND MESSAGE - Current sessionId:', sessionId);
    console.log('💬 SEND MESSAGE - Agent sessions:', agentSessions);
    
    if (!sessionId) {
      sessionId = agentSessions[selectedAgent.id];
      console.log('💬 SEND MESSAGE - Found existing session for agent:', sessionId);
      if (!sessionId) {
        sessionId = `${profile?.user_id}_${selectedAgent.id}_${Date.now()}`;
        console.log('💬 SEND MESSAGE - Creating new session:', sessionId);
        updateAgentSessions(prev => ({ ...prev, [selectedAgent.id]: sessionId }));
      }
      setCurrentSessionId(sessionId);
      console.log(`💬 SEND MESSAGE - Using session for agent: ${selectedAgent.name} - ${sessionId}`);
    }
    
    const userMessage = inputMessage.trim();
    console.log('Sending message:', userMessage, 'Session ID:', sessionId);
    
    // Check if message contains a URL
    const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatch && urlMatch[0]) {
      console.log('🔍 Website URL detected:', urlMatch[0]);
      
      // Show website analysis loading indicators (temporary - no chat messages)
      setWebsiteAnalysisLoading({
        detecting: true,
        screenshot: true,
        favicon: true,
        analysis: true
      });
    }
    
    // Add user message to UI and cache
    const userMsg = { sender: 'user', text: userMessage, timestamp: new Date().toISOString() };
    addMessage(userMsg);
    
    // Let backend handle database saving to avoid duplicate constraint violations
    console.log('💾 DATABASE SAVE - Skipping frontend save, letting backend handle it via WebSocket');
    
    // Send via WebSocket
    console.log('WebSocket status:', websocket.getStatus(), 'Connection state:', connectionStatus);
    
    try {
      // Pass the selected agent's agent_name to WebSocket
      const agentName = selectedAgent.agent_name || selectedAgent.id;
      console.log(`🎯 Sending message with agent: ${agentName} (selected agent: ${selectedAgent.name})`);
      await websocket.sendMessage(userMessage, undefined, agentName);
    } catch (error) {
      console.error('Failed to send message:', error);
      setWebsocketLogs(prev => [...prev, {
        timestamp: new Date(),
        type: 'error',
        message: `Failed to send message: ${error}`,
        data: error
      }]);
      setIsSendingMessage(false);
      return;
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
  
  // Handle enabling agent
  const handleEnableAgent = async (agentId: string) => {
    console.log(`🤖 Enabling agent: ${agentId}`);
    
    let success = false;
    
    if (agentId === 'SOLAgent') {
      // Use special SOL Agent enabling function
      success = await enableSOLAgent();
    } else if (agentId === 'PersonalAssistant') {
      // For PersonalAssistant, use agent_config setup type
      success = await updateAgentEnabledStatus(agentId, 'agent_config', true);
    } else {
      // For other agents, use agent_config as default
      success = await updateAgentEnabledStatus(agentId, 'agent_config', true);
    }
    
    if (success) {
      console.log('✅ Agent enabled in database, refreshing UI...');
      
      // Hide the prompt and re-enable chat
      setShowEnableAgentPrompt({ show: false, agentId: '', agentName: '' });
      setChatDisabled(false);
      
      // Add a small delay to ensure database update is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload agents from database to reflect changes
      console.log('🔄 Reloading agents from database...');
      await loadAgentsFromDatabase();
      
      // Force update trigger to refresh UI components
      setAgentUpdateTrigger(prev => prev + 1);
      
      console.log('✅ Agent enabled successfully and UI refreshed');
      
      // For SOL Agent, auto-switch and show setup after agents are reloaded
      if (agentId === 'SOLAgent') {
        // Wait for state to update and ensure proper session creation
        setTimeout(async () => {
          console.log('🌞 SOL Agent auto-switch timer triggered');
          const agents = await getEnabledAgents();
          const solAgent = agents.find(a => a.id === 'SOLAgent');
          console.log('🔍 Found SOL Agent in enabled agents:', solAgent);
          
          if (solAgent) {
            console.log('🔄 Auto-switching to SOL Agent tab...');
            await handleAgentSelect(solAgent);
            
            // Ensure setup is shown after agent selection
            setTimeout(() => {
              console.log('🔧 Setting showSOLSetup to true after agent selection');
              setShowSOLSetup(true);
            }, 500);
          } else {
            console.error('❌ SOL Agent not found in enabled agents list');
          }
        }, 1500);
      }
      
      // Add welcome message to database for newly enabled agent
      if (profile?.user_id) {
        try {
          const userIdResult = await getUserId();
          if (userIdResult.success && userIdResult.user_id) {
            const sessionId = `${userIdResult.user_id}_${agentId}_${Date.now()}`;
            
            // Get agent name from database
            const agent = allAgents.find(a => a.id === agentId);
            const agentName = agent?.name || agentId;
            
            // Create welcome message for the enabled agent
            let welcomeMessage = '';
            if (agentId === 'SOLAgent') {
              welcomeMessage = `Hello! I'm your Solar Sales Specialist. I've been enabled and I'm ready to help customers find the perfect solar energy solutions, calculate savings, and guide them through the transition to renewable energy. 

To get started, let's set up your solar business configuration step by step:
1. 🌞 Solar Business Setup - Configure your pricing, financing options, and business details
2. 📅 Calendar Integration - Connect your scheduling system 
3. 🔔 Notification Preferences - Set up your alert preferences

Let's begin with your Solar Business Setup! ☀️`;
            } else {
              welcomeMessage = `Hello! I'm ${agentName} and I've been enabled. I'm ready to assist you!`;
            }
            
            // For SOL Agent, add welcome message to its own chat cache and switch to it
            if (agentId === 'SOLAgent') {
              const welcomeMsg = {
                sender: 'agent',
                text: welcomeMessage,
                timestamp: new Date().toISOString()
              };
              
              // Store welcome message in SOL Agent's chat cache
              updateAgentChatCache(prevCache => ({ 
                ...prevCache, 
                [agentId]: [welcomeMsg]
              }));
              
              // Auto-switch will be handled by the new logic above after agents are reloaded
              
              console.log(`✅ SOL Agent welcome message added to SOL Agent tab`);
            } else {
              // For other agents, add to current chat
              addMessage({
                sender: 'agent',
                text: welcomeMessage,
                timestamp: new Date().toISOString()
              });
              console.log(`✅ Agent ${agentId} welcome message added to current chat`);
            }
          }
        } catch (error) {
          console.error('Error saving agent enable message:', error);
        }
      }
      
      // Show success message in UI
      addMessage({
        sender: 'system',
        text: `✅ ${showEnableAgentPrompt.agentName} has been enabled and will persist across sessions! You can now find it in the Agents tab.`,
        timestamp: Date.now()
      });
      
      console.log('✅ Agent enabled permanently and will appear on next login!');
    } else {
      console.error('❌ Failed to enable agent');
    }
  };
  
  // Handle declining agent enablement
  const handleDeclineAgent = () => {
    console.log('🚫 Agent enabling declined');
    
    // Hide the prompt and re-enable chat
    setShowEnableAgentPrompt({ show: false, agentId: '', agentName: '' });
    setChatDisabled(false);
    
    // Optional: Show a message
    addMessage({
      sender: 'system',
      text: 'No problem! You can always enable additional agents later if needed.',
      timestamp: Date.now()
    });
  };
  
  // Solar agent setup function removed - now using simple enable/disable approach

  // Handle progressive setup completion
  const handleProgressiveSetupComplete = () => {
    console.log('🌞 Progressive Solar Sales Specialist setup completed');
    setShowSOLSetup(false);
    
    // Add completion message to SOL Agent chat
    if (selectedAgent?.id === 'SOLAgent') {
      addMessage({
        sender: 'agent',
        text: '🎉 Perfect! Your solar business configuration is now complete. I\'m fully ready to help you with customer consultations, pricing calculations, and closing solar deals. You can always update these settings later. Let\'s start helping your customers go solar! ☀️',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleProgressiveSetupSkip = () => {
    console.log('🌞 Progressive setup skipped');
    setShowSOLSetup(false);
    
    // Add skip message to SOL Agent chat  
    if (selectedAgent?.id === 'SOLAgent') {
      addMessage({
        sender: 'agent',
        text: 'No problem! You can set up your solar business configuration later. I\'m still ready to help you with basic solar consultations. To access advanced features like custom pricing and financing calculations, you can complete the setup anytime through the settings.',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Progressive setup handlers removed - SOL Agent now uses simple enable/disable

  // Agent enabled status is now handled by database loading in loadAgentsFromDatabase
  
  // Listen for agent updates and refresh agents list
  useEffect(() => {
    const handleAgentUpdate = () => {
      console.log('Agent update event received in Dashboard, refreshing agents list');
      loadAgentsFromDatabase(); // Reload from database instead of local files
    };
    
    window.addEventListener('agentUpdated', handleAgentUpdate);
    
    return () => {
      window.removeEventListener('agentUpdated', handleAgentUpdate);
    };
  }, []);
  
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
                <div className="w-8 h-8 rounded-full mr-2 overflow-hidden border-2 border-gray-600">
                  {agent.id === 'PersonalAssistant' ? (
                    <img 
                      src="/seth.JPG" 
                      alt="Personal Assistant Bot" 
                      className="w-full h-full object-cover"
                    />
                  ) : agent.id === 'SOLAgent' ? (
                    <img 
                      src="/avatars/lead-gen-specialist.jpg" 
                      alt="Solar Sales Specialist" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
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
                      avatarTimeout={6000}
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
                {/* EMERGENCY DEBUG - SHOULD ALWAYS SHOW */}
                <div style={{backgroundColor: 'red', color: 'white', padding: '10px', margin: '10px 0', border: '3px solid yellow', fontSize: '14px'}}>
                  🚨 EMERGENCY DEBUG 🚨<br/>
                  Agent: {selectedAgent?.id || 'NONE'}<br/>
                  Name: {selectedAgent?.name || 'NONE'}<br/>
                  SOLSetup: {String(showSOLSetup)}<br/>
                  Messages: {messages.length}<br/>
                  Timestamp: {new Date().toISOString()}
                </div>
                
                {messages.length === 0 ? (
                  <div className="mt-4">
                    {/* TEMPORARILY DISABLED AgentGreeting */}
                    {/* {selectedAgent && (
                      <AgentGreeting 
                        agentId={selectedAgent.id} 
                        className="mb-4"
                      />
                    )} */}
                    
                    {/* SOL Agent now uses simple enable/disable - no progressive setup needed */}
                    
                    <div className="text-center text-gray-400 mt-6">
                      Start a conversation...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* CRITICAL DEBUG: This should ALWAYS render */}
                    <div className="mb-4 bg-yellow-400 text-black p-2 rounded">
                      <strong>CRITICAL DEBUG:</strong> Agent={selectedAgent?.id || 'none'}, SOLSetup={String(showSOLSetup)}, Timestamp={Date.now()}
                    </div>
                    
                    {/* UNIVERSAL DEBUG: Show regardless of agent */}
                    <div className="mb-4 border-2 border-blue-500 p-4 rounded bg-blue-50">
                      <h3 className="text-blue-700 font-bold mb-2">🔍 UNIVERSAL DEBUG</h3>
                      <div className="text-sm text-blue-600">
                        <p>selectedAgent?.id: "{selectedAgent?.id}"</p>
                        <p>selectedAgent?.name: "{selectedAgent?.name}"</p>
                        <p>showSOLSetup: {String(showSOLSetup)}</p>
                        <p>Is SOL Agent?: {selectedAgent?.id === 'SOLAgent' ? 'YES' : 'NO'}</p>
                        <p>currentSessionId: {currentSessionId}</p>
                        <button 
                          onClick={() => {
                            console.log('🔧 FULL DEBUG STATE:');
                            console.log('- selectedAgent:', selectedAgent);
                            console.log('- showSOLSetup:', showSOLSetup);
                            console.log('- currentSessionId:', currentSessionId);
                            setShowSOLSetup(true);
                          }}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm mt-2"
                        >
                          Force Enable Setup & Log
                        </button>
                      </div>
                    </div>
                    
                    {/* SOL Agent Setup Rendering */}
                    {selectedAgent?.id === 'SOLAgent' && showSOLSetup && (
                      <div className="mb-4 border-2 border-green-500 p-4 rounded">
                        <h3 className="text-green-700 font-bold mb-2">✅ SOL AGENT SETUP</h3>
                        <ProgressiveSOLSetup
                          onComplete={handleProgressiveSetupComplete}
                          onSkip={handleProgressiveSetupSkip}
                          sessionId={currentSessionId || `sol_session_${Date.now()}`}
                        />
                      </div>
                    )}
                    
                    {/* Show agent greeting as first message - TEMPORARILY DISABLED FOR DEBUGGING */}
                    {/* {selectedAgent && (
                      <AgentGreeting 
                        agentId={selectedAgent.id} 
                        className="mb-4"
                      />
                    )} */}

                    {/* Session History for Current Agent */}
                    {selectedAgent && agentSessionHistory[selectedAgent.id] && agentSessionHistory[selectedAgent.id].length > 0 && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Chat History</h4>
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => {
                              // Load current session (already active)
                              console.log('Current session already loaded');
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded font-medium"
                          >
                            Current
                          </button>
                          {agentSessionHistory[selectedAgent.id].map((sessionId, index) => (
                            <button
                              key={sessionId}
                              onClick={async () => {
                                console.log(`Loading previous session: ${sessionId}`);
                                await loadChatHistoryForAgent(selectedAgent, sessionId, true);
                              }}
                              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Previous {index + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* DEBUG: Show current state */}
                    {selectedAgent?.id === 'SOLAgent' && (
                      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
                        <strong>🔍 DEBUG INFO:</strong><br/>
                        • selectedAgent.id: {selectedAgent?.id}<br/>
                        • showSOLSetup: {showSOLSetup ? 'true' : 'false'}<br/>
                        • Will render ProgressiveSOLSetup: {selectedAgent?.id === 'SOLAgent' && showSOLSetup ? 'YES' : 'NO'}<br/>
                        • currentSessionId: {currentSessionId}
                      </div>
                    )}

                    {/* UNIVERSAL DEBUG: Show regardless of agent */}
                    <div className="mb-4 border-2 border-blue-500 p-4 rounded bg-blue-50">
                      <h3 className="text-blue-700 font-bold mb-2">🔍 UNIVERSAL DEBUG</h3>
                      <div className="text-sm text-blue-600">
                        <p>selectedAgent?.id: "{selectedAgent?.id}"</p>
                        <p>selectedAgent?.name: "{selectedAgent?.name}"</p>
                        <p>showSOLSetup: {String(showSOLSetup)}</p>
                        <p>Is SOL Agent?: {selectedAgent?.id === 'SOLAgent' ? 'YES' : 'NO'}</p>
                        <p>currentSessionId: {currentSessionId}</p>
                        <button 
                          onClick={() => {
                            console.log('🔧 FULL DEBUG STATE:');
                            console.log('- selectedAgent:', selectedAgent);
                            console.log('- showSOLSetup:', showSOLSetup);
                            console.log('- currentSessionId:', currentSessionId);
                            setShowSOLSetup(true);
                          }}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm mt-2"
                        >
                          Force Enable Setup & Log
                        </button>
                      </div>
                    </div>
                    
                    {/* SOL Agent Setup Rendering */}
                    {selectedAgent?.id === 'SOLAgent' && showSOLSetup && (
                      <div className="mb-4 border-2 border-green-500 p-4 rounded">
                        <h3 className="text-green-700 font-bold mb-2">✅ SOL AGENT SETUP</h3>
                        <ProgressiveSOLSetup
                          onComplete={handleProgressiveSetupComplete}
                          onSkip={handleProgressiveSetupSkip}
                          sessionId={currentSessionId || `sol_session_${Date.now()}`}
                        />
                      </div>
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
                    
                    {/* Website Analysis Loading Indicator - Shows after URL input */}
                    {(websiteAnalysisLoading.detecting || websiteAnalysisLoading.screenshot || websiteAnalysisLoading.favicon || websiteAnalysisLoading.analysis) && (
                      <div className="mb-4">
                        <div className="bg-blue-900 bg-opacity-20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                            <span className="text-blue-400 font-medium">Analyzing website...</span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {websiteAnalysisLoading.detecting && (
                              <div className="flex items-center space-x-2 text-sm text-blue-300">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Detecting website...</span>
                              </div>
                            )}
                            {websiteAnalysisLoading.screenshot && (
                              <div className="flex items-center space-x-2 text-sm text-blue-300">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Taking screenshot...</span>
                              </div>
                            )}
                            {websiteAnalysisLoading.favicon && (
                              <div className="flex items-center space-x-2 text-sm text-blue-300">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Getting favicon...</span>
                              </div>
                            )}
                            {websiteAnalysisLoading.analysis && (
                              <div className="flex items-center space-x-2 text-sm text-blue-300">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Analyzing content (may take 1-2 minutes)...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Show Enable Agent Prompt */}
                    {showEnableAgentPrompt.show && (
                      <div className="mb-4">
                        <EnableAgentPrompt
                          agentName={showEnableAgentPrompt.agentName}
                          agentId={showEnableAgentPrompt.agentId}
                          onEnable={handleEnableAgent}
                          onDecline={handleDeclineAgent}
                        />
                      </div>
                    )}
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
                    placeholder={chatDisabled ? "Please respond to the prompt above..." : "Type a message..."}
                    className="flex-1 bg-[#1B2431] text-white placeholder:text-gray-400 px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[42px] max-h-[120px] overflow-y-auto border border-gray-600"
                    disabled={!textEnabled || chatDisabled}
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
                    disabled={!textEnabled || chatDisabled || isSendingMessage}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors disabled:opacity-50 min-h-[42px] flex items-center border border-l-0 border-gray-600"
                  >
                    {isSendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Send size={16} />
                    )}
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
      
      {/* Chat History Modal */}
      {showChatHistory && (
        <ChatHistory
          isOpen={showChatHistory}
          onClose={() => setShowChatHistory(false)}
          agentId={selectedAgent?.id}
        />
      )}
      
    </div>
  );
};

export default EnhancedDashboard;