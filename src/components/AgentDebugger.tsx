// AgentDebugger.tsx - Debug component to trace agent loading issues
'use client';

import React, { useState, useEffect } from 'react';
import { getUserAgents, getEnabledAgents } from '@/services/agentService';
import { getUserAgentsFromBackend } from '@/services/backendApiService';
import { getUserId } from '@/utils/getUserId';

const AgentDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testAgentLoading();
  }, []);

  const testAgentLoading = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 AgentDebugger: Starting comprehensive test...');
      
      // Step 1: Get user ID
      const userIdResult = await getUserId();
      console.log('1. User ID Result:', userIdResult);
      
      if (!userIdResult.success || !userIdResult.user_id) {
        setDebugInfo({ error: 'Failed to get user ID', userIdResult });
        return;
      }

      // Step 2: Direct backend API call
      const backendAgents = await getUserAgentsFromBackend(userIdResult.user_id);
      console.log('2. Backend Agents:', backendAgents);

      // Step 3: Frontend service call
      const allAgents = await getUserAgents();
      console.log('3. All Agents (via service):', allAgents);

      // Step 4: Enabled agents only
      const enabledAgents = await getEnabledAgents();
      console.log('4. Enabled Agents:', enabledAgents);

      // Step 5: Manual filtering test
      const manualFiltered = allAgents.filter(agent => agent.enabled);
      console.log('5. Manual Filter Test:', manualFiltered);

      // Step 6: SOL Agent specific checks
      const solAgentAll = allAgents.find(a => a.id === 'SOLAgent');
      const solAgentEnabled = enabledAgents.find(a => a.id === 'SOLAgent');
      const solAgentBackend = backendAgents.find(a => a.agent_id === 'SOLAgent');

      console.log('6. SOL Agent Analysis:');
      console.log('  - In all agents:', solAgentAll);
      console.log('  - In enabled agents:', solAgentEnabled);
      console.log('  - From backend:', solAgentBackend);

      setDebugInfo({
        userId: userIdResult.user_id,
        backendCount: backendAgents.length,
        allAgentsCount: allAgents.length,
        enabledAgentsCount: enabledAgents.length,
        backendAgents,
        allAgents,
        enabledAgents,
        manualFiltered,
        solAgentChecks: {
          inAll: !!solAgentAll,
          inEnabled: !!solAgentEnabled,
          backendEnabled: solAgentBackend?.is_enabled,
          allAgentEnabled: solAgentAll?.enabled,
          enabledAgentEnabled: solAgentEnabled?.enabled
        }
      });

    } catch (error) {
      console.error('AgentDebugger error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 bg-gray-800 text-white">Loading agent debug info...</div>;
  }

  return (
    <div className="p-4 bg-gray-800 text-white max-w-4xl">
      <h2 className="text-xl font-bold mb-4">🔍 Agent Loading Debug Info</h2>
      
      {debugInfo?.error ? (
        <div className="bg-red-900 p-3 rounded">
          <strong>Error:</strong> {debugInfo.error}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <strong>User ID:</strong> {debugInfo?.userId}
          </div>
          
          <div>
            <strong>Counts:</strong>
            <ul className="ml-4">
              <li>Backend agents: {debugInfo?.backendCount}</li>
              <li>All agents (mapped): {debugInfo?.allAgentsCount}</li>
              <li>Enabled agents: {debugInfo?.enabledAgentsCount}</li>
            </ul>
          </div>

          <div>
            <strong>SOL Agent Status:</strong>
            <ul className="ml-4">
              <li>Present in all agents: {debugInfo?.solAgentChecks?.inAll ? '✅' : '❌'}</li>
              <li>Present in enabled agents: {debugInfo?.solAgentChecks?.inEnabled ? '✅' : '❌'}</li>
              <li>Backend is_enabled value: {debugInfo?.solAgentChecks?.backendEnabled ? '✅ true' : '❌ false'}</li>
              <li>Mapped enabled value: {debugInfo?.solAgentChecks?.allAgentEnabled ? '✅ true' : '❌ false'}</li>
            </ul>
          </div>

          <div>
            <strong>Raw Data:</strong>
            <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <button 
        onClick={testAgentLoading}
        className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
      >
        🔄 Re-test Agent Loading
      </button>
    </div>
  );
};

export default AgentDebugger;