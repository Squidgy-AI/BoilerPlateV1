// src/components/Dashboard/EnhancedDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import EnhancedChat from '../EnhancedChat';
import ProfileSettings from '../ProfileSettings';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GroupManagement from '../Groups/GroupManagement';

const EnhancedDashboard: React.FC = () => {
  const { profile, isLoading } = useAuth();
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  
  // Check if mobile on initial load and when window is resized
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Close sidebar on mobile when session selected
  useEffect(() => {
    if (isMobile && currentSessionId) {
      setShowSidebar(false);
    }
  }, [currentSessionId, isMobile]);
  
  // Fetch session details when session changes
  useEffect(() => {
    if (!currentSessionId || !profile) return;
    
    const fetchSessionDetails = async () => {
      try {
        if (isGroupSession) {
          // Fetch group details
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('id', currentSessionId)
            .single();
            
          if (groupError) throw groupError;
          
          setSessionName(groupData.name);
          
          // Fetch group members
          const { data: membersData, error: membersError } = await supabase
            .from('group_members')
            .select('user_id, role, is_agent, agent_type, profiles(full_name, avatar_url)')
            .eq('group_id', currentSessionId);
            
          if (membersError) throw membersError;
          
          const formattedMembers = membersData.map(member => ({
            id: member.user_id,
            name: member.profiles?.full_name || 'Unknown',
            avatar: member.profiles?.avatar_url || '',
            role: member.role,
            isAgent: member.is_agent,
            agentType: member.agent_type
          }));
          
          setGroupMembers(formattedMembers);
        } else {
          // Check if this is an agent
          const agents = [
            { id: 'agent1', name: 'Product Manager', type: 'ProductManager' },
            { id: 'agent2', name: 'Pre-Sales Consultant', type: 'PreSalesConsultant' },
            { id: 'agent3', name: 'Social Media Manager', type: 'SocialMediaManager' },
            { id: 'agent4', name: 'Lead Gen Specialist', type: 'LeadGenSpecialist' }
          ];
          
          const agent = agents.find(a => a.id === currentSessionId);
          
          if (agent) {
            setSessionName(agent.name);
            setGroupMembers([]);
          } else {
            // Fetch user details
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentSessionId)
              .single();
              
            if (userError) throw userError;
            
            setSessionName(userData.full_name);
            setGroupMembers([]);
          }
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      }
    };
    
    fetchSessionDetails();
  }, [currentSessionId, isGroupSession, profile]);
  
  // Handle session selection
  const handleSessionSelect = (sessionId: string, isGroup: boolean = false) => {
    setCurrentSessionId(sessionId);
    setIsGroupSession(isGroup);
  };
  
  // Create a new session
  const handleNewSession = () => {
    const newSessionId = 'agent1'; // ProductManager agent
    setCurrentSessionId(newSessionId);
    setIsGroupSession(false);
  };
  
  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1B2431] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Make sure user is authenticated
  if (!profile) {
    return null; // Let the parent component handle authentication
  }
  
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden bg-[#1E2A3B]">
      <Header 
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onNewChat={handleNewSession}
        onOpenSettings={() => setShowProfileSettings(true)}
      />
      
      <div className="flex w-full h-full pt-16">
        {/* Mobile sidebar overlay */}
        {showSidebar && isMobile && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        {/* Sidebar with visibility toggle for mobile */}
        <div className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform w-full md:w-80 fixed md:relative left-0 top-16 bottom-0 z-20 bg-[#1B2431] border-r border-gray-700 overflow-hidden`}>
          <Sidebar 
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            currentSessionId={currentSessionId}
          />
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          {/* Session Header */}
          {currentSessionId && (
            <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-[#2D3B4F]">
              <div className="flex items-center">
                {/* Back button on mobile */}
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="p-1 mr-2 text-gray-400 hover:text-white rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                )}
                <h2 className="font-medium text-white">{sessionName}</h2>
                {isGroupSession && (
                  <button
                    onClick={() => setShowGroupManagement(true)}
                    className="ml-2 p-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Manage Group
                  </button>
                )}
              </div>
              
              {/* Group members preview */}
              {isGroupSession && groupMembers.length > 0 && (
                <div className="flex -space-x-2">
                  {groupMembers.slice(0, 3).map((member) => (
                    <div 
                      key={member.id}
                      className="w-6 h-6 rounded-full bg-gray-600 border-2 border-[#2D3B4F] flex items-center justify-center overflow-hidden"
                      title={member.name}
                    >
                      {member.avatar ? (
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs">{member.name.charAt(0)}</span>
                      )}
                    </div>
                  ))}
                  
                  {groupMembers.length > 3 && (
                    <div 
                      className="w-6 h-6 rounded-full bg-gray-700 border-2 border-[#2D3B4F] flex items-center justify-center text-xs text-white"
                    >
                      +{groupMembers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {currentSessionId ? (
            <div className="flex-1 overflow-hidden">
              <EnhancedChat 
                sessionId={currentSessionId}
                isGroup={isGroupSession}
                onNewSession={handleNewSession}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-[#1E2A3B] text-gray-400">
              <div className="text-center px-6">
                <img 
                  src="/welcome-illustration.svg" 
                  alt="Welcome to Squidgy" 
                  className="w-64 h-64 mx-auto mb-6 opacity-60"
                />
                <h2 className="text-xl mb-4">Welcome to Squidgy</h2>
                <p className="mb-6 max-w-md">Select a conversation from the sidebar or start a new chat with one of our AI agents.</p>
                <button
                  onClick={handleNewSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
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