'use client';

import React, { useEffect, useState } from 'react';
import ThinkingProcess from './ThinkingProcess';
import WebSocketDebugger from './WebSocketDebugger';
import { FileDown, MapPin, Sun, Calendar } from 'lucide-react';
import { useRef} from 'react';

interface Session {
  id: string;
  createdAt: Date;
  name: string;
  messageCount: number;
  lastActive: Date;
}

interface UserDashboardProps {
  userId: string;
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onTopicSelect: (topic: string) => void;
  websiteData?: {
    url?: string;
    favicon?: string;
    screenshot?: string;
    analysis?: string;
  };
  // Props for ThinkingProcess integration
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
  solarResults?: SolarResult[];
}

interface SolarResult {
  timestamp: number;
  address: string;
  type: 'insights' | 'datalayers' | 'report';
  data: any;
}





const UserDashboard: React.FC<UserDashboardProps> = ({ 
  userId, 
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onTopicSelect,
  websiteData,
  websocket,
  currentRequestId,
  isProcessing
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedTopics] = useState([
    "What can Squidgy do for my business?",
    "How can you analyze my website?",
    "Set up a consultation appointment",
    "Help with social media strategy"
  ]);
  // Add this state to your component
  const [solarResults, setSolarResults] = useState<SolarResult[]>([]);
  const solarResultsRef = useRef<HTMLDivElement>(null);
  
  // Get backend URL from environment or use default
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  const backendUrl = `https://${apiBase}`;
  
  // Sample data for testing - will only show if real data isn't available
  const testWebsiteData = {
    url: "https://example.com",
    favicon: "/sample-favicon.png",
    screenshot: "/sample-screenshot.jpg",
    analysis: "---*SEO Score*: 85/100\n---*Mobile Friendly*: Yes\n---*Performance*: Good\n---*Accessibility*: Needs improvement"
  };

  // Function to load sessions from API
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://${apiBase}/chat-history?session_id=${currentSessionId}`);

        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process sessions data
        let sessionsList = sessions.filter(s => s.id !== currentSessionId);
        
        // Add current session with message count from history
        sessionsList.unshift({
          id: currentSessionId,
          createdAt: new Date(),
          name: formatSessionName(currentSessionId),
          messageCount: data?.history?.length || 0,
          lastActive: new Date()
        });
        
        // Limit to 10 most recent sessions
        sessionsList = sessionsList.slice(0, 10);
        
        setSessions(sessionsList);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        // Ensure current session exists even if API call fails
        if (!sessions.some(s => s.id === currentSessionId)) {
          setSessions([{
            id: currentSessionId,
            createdAt: new Date(),
            name: formatSessionName(currentSessionId),
            messageCount: 0,
            lastActive: new Date()
          }, ...sessions]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [currentSessionId, backendUrl]);

  useEffect(() => {
    // In a real implementation, you would get this from your WebSocket data
    // This is just a placeholder for demonstration
    if (websocket && isProcessing && currentRequestId) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'tool_result' && 
              (data.tool === 'get_insights' || 
               data.tool === 'get_datalayers' || 
               data.tool === 'get_report')) {
            
            // Add the new result to the solar results array
            setSolarResults(prev => [{
              timestamp: Date.now(),
              address: data.result?.location?.address || 
                      data.params?.address || 
                      'Unknown Address',
              type: data.tool.replace('get_', '') as any,
              data: data.result
            }, ...prev].slice(0, 10)); // Keep only the latest 10 results
          }
        } catch (error) {
          console.error('Error handling solar result:', error);
        }
      };
      
      websocket.addEventListener('message', handleMessage);
      return () => {
        websocket.removeEventListener('message', handleMessage);
      };
    }
  }, [websocket, isProcessing, currentRequestId]);

  useEffect(() => {
    if (solarResultsRef.current && solarResults.length > 0) {
      solarResultsRef.current.scrollTop = 0;
    }
  }, [solarResults.length]);

  // Function to format session name from ID
  const formatSessionName = (id: string): string => {
    // Extract date part from session ID if it follows userId_timestamp format
    if (id.includes('_')) {
      const timestamp = id.split('_')[1];
      if (!isNaN(Number(timestamp))) {
        const date = new Date(Number(timestamp));
        return `Chat on ${date.toLocaleDateString()}`;
      }
    }
    return "New Conversation";
  };

  // Handle suggested topic click
  const handleTopicClick = (topic: string) => {
    onTopicSelect(topic);
    console.log("Selected topic:", topic);
  };

  // Use either real website data or test data with proper processing
  // Replace the displayData useMemo function in UserDashboard.tsx with this:

// Use either real website data or test data with proper processing
// Update the displayData function in UserDashboard.tsx:

const displayData = React.useMemo(() => {
  // If no websiteData provided or it's empty, use test data
  if (!websiteData || 
     (!websiteData.url && !websiteData.screenshot && !websiteData.favicon && !websiteData.analysis)) {
    return testWebsiteData;
  }

  // Log for debugging
  console.log("Processing website data:", websiteData);
  
  // Process screenshot path with extra safety checks
  let screenshot = '';
  if (websiteData.screenshot) {
    screenshot = typeof websiteData.screenshot === 'string' ? websiteData.screenshot : '';
    
    // Fix URL format if needed
    if (screenshot && !screenshot.startsWith('http') && screenshot.startsWith('/static/')) {
      screenshot = `https://${apiBase}${screenshot}`;
    }
  }
  
  // Process favicon path similarly
  let favicon = '';
  if (websiteData.favicon) {
    favicon = typeof websiteData.favicon === 'string' ? websiteData.favicon : '';
    
    // Fix URL format if needed
    if (favicon && !favicon.startsWith('http') && favicon.startsWith('/static/')) {
      favicon = `https://${apiBase}${favicon}`;
    }
  }

  return {
    url: typeof websiteData.url === 'string' ? websiteData.url : '',
    screenshot: screenshot,
    favicon: favicon,
    analysis: typeof websiteData.analysis === 'string' ? websiteData.analysis : ''
  };
}, [websiteData, apiBase]);

  // Log for debugging
  useEffect(() => {
    console.log("Current displayData:", displayData);
  }, [displayData]);

  return (
    <div className="w-full h-full bg-[#1B2431] text-white flex flex-col p-8 overflow-y-auto">
      {/* User Profile Section */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Squidgy Dashboard</h1>
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xl">{userId.charAt(0).toUpperCase()}</span>
        </div>
      </div>
  
      {/* WebSocket Debugger - Prominently displayed at the top */}
      <WebSocketDebugger websocket={websocket} />
  
      {/* Thinking Process Visualization */}
      <ThinkingProcess
        websocket={websocket}
        currentRequestId={currentRequestId}
        isProcessing={isProcessing}
        sessionId={currentSessionId}
      />
  
      {/* Connection Info */}
      <div className="mb-4 p-2 bg-[#2D3B4F] rounded-lg text-xs">
        <div className="flex justify-between">
          <div>
            <span className="text-gray-400">User ID:</span> {userId}
          </div>
          <div>
            <span className="text-gray-400">Session:</span> {currentSessionId.substring(0, 12)}...
          </div>
        </div>
        <div className="mt-1">
          <span className="text-gray-400">Status:</span> 
          {/* Add animation for connecting state */}
          {isProcessing ? (
            <span className="ml-1 text-yellow-400 animate-pulse">
              Processing...
            </span>
          ) : (
            <span className={`ml-1 ${
              websocket ? 'text-green-400' : 
              (!websocket && isProcessing) ? 'text-yellow-400 animate-pulse' : 'text-red-400'
            }`}>
              {websocket ? 'Connected' : (!websocket && isProcessing) ? 'Connecting...' : 'Disconnected'}
            </span>
          )}
          {currentRequestId && (
            <span className="ml-2">
              <span className="text-gray-400">Request:</span> 
              <span className="ml-1 text-yellow-400">{currentRequestId.substring(0, 8)}...</span>
            </span>
          )}
        </div>
      </div>
  
      {/* Website Analysis Section */}
      <div className="mb-6 bg-[#2D3B4F] rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Website Analysis</h2>
        
        <div className="flex items-center mb-4">
          {displayData.favicon && (
            <div className="mr-4 w-12 h-12 relative overflow-hidden rounded-md bg-white p-1">
              <img 
                src={displayData.favicon}
                alt="Website Favicon"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error("Favicon load error:", e);
                  e.currentTarget.src = "/fallback-icon.jpg"; // Fallback icon
                }}
              />
            </div>
          )}
          <a 
            href={displayData.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {displayData.url || "Website URL"}
          </a>
        </div>
        
        {displayData.screenshot && (
          <div className="w-full h-48 relative rounded-lg overflow-hidden mb-4 bg-slate-800">
            <img
              src={`${displayData.screenshot}?t=${Date.now()}`} // Add cache buster
              alt="Website Screenshot"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                console.error("Screenshot load error:", e);
                // Try to reload with cache-busting param
                const target = e.currentTarget;
                const currentSrc = target.src;
                // Only retry once to avoid infinite loop
                if (!currentSrc.includes('?retry=true')) {
                  target.src = `${displayData.screenshot}?retry=true&t=${Date.now()}`;
                } else {
                  // Replace with fallback image after retry
                  target.src = "/fallback-screenshot.jpg";
                }
              }}
            />
          </div>
        )}
        
        {/* Display analysis if available */}
        {displayData.analysis && (
          <div className="mt-4 bg-slate-900 p-3 rounded-lg">
            {displayData.analysis.split('\n').map((line, index) => {
              // Parse the line to extract key and value
              const match = line.match(/^---\s*\*(.*?)\*:\s*(.*)$/);
              if (match) {
                const [_, key, value] = match;
                return (
                  <div key={index} className="flex mb-1">
                    <span className="font-medium text-gray-400 min-w-[140px]">{key}:</span>
                    <span className="text-white">{value}</span>
                  </div>
                );
              }
              return <div key={index} className="text-gray-300">{line}</div>;
            })}
          </div>
        )}
      </div>

      {/* Solar Results Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Solar Analysis Results</h2>
          {solarResults.length > 0 && (
            <div className="text-xs text-gray-400">
              {solarResults.length} {solarResults.length === 1 ? 'result' : 'results'}
            </div>
          )}
        </div>
        
        <div 
          ref={solarResultsRef}
          className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar"
        >
          {solarResults.length > 0 ? (
            solarResults.map((result, index) => (
              <div 
                key={`solar-result-${result.timestamp}-${index}`}
                className="p-3 bg-[#2D3B4F] rounded-lg cursor-pointer hover:bg-[#374863] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      {result.type === 'insights' && <Sun size={16} className="text-yellow-400 mr-2" />}
                      {result.type === 'datalayers' && <MapPin size={16} className="text-green-400 mr-2" />}
                      {result.type === 'report' && <FileDown size={16} className="text-blue-400 mr-2" />}
                      <p className="font-medium text-white capitalize">{result.type} Analysis</p>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{result.address}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {/* Render different content based on result type */}
                {result.type === 'insights' && result.data?.solarPotential && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-800 p-2 rounded">
                      <div className="text-gray-400">Panel Count</div>
                      <div className="text-white">{result.data.solarPotential.idealPanelCount || '--'}</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded">
                      <div className="text-gray-400">Est. Savings</div>
                      <div className="text-white">${result.data.solarPotential.estimatedSavings ? 
                        Math.round(result.data.solarPotential.estimatedSavings).toLocaleString() : '--'}
                      </div>
                    </div>
                  </div>
                )}
                
                {result.type === 'datalayers' && result.data?.layers && (
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {result.data.layers.slice(0, 4).map((layer: any, i: number) => (
                      <div key={i} className="bg-slate-800 h-12 rounded overflow-hidden relative">
                        {layer.imageUrl && (
                          <img 
                            src={layer.imageUrl} 
                            alt={layer.name} 
                            className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {result.type === 'report' && result.data?.reportUrl && (
                  <div className="mt-2">
                    <a 
                      href={result.data.reportUrl} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-xs bg-blue-900 hover:bg-blue-800 text-white py-1 px-2 rounded transition-colors w-full"
                    >
                      <FileDown size={12} className="mr-1" />
                      View Solar Report
                    </a>
                    {result.data.summary && (
                      <div className="mt-1 text-xs text-gray-400">
                        {result.data.summary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 bg-[#2D3B4F] rounded-lg">
              No solar analysis results yet
            </div>
          )}
        </div>
      </div>
  
      {/* Sessions Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Conversations</h2>
          <button 
            onClick={onNewSession}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            New Conversation
          </button>
        </div>
  
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {sessions.length > 0 ? (
              sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    session.id === currentSessionId 
                      ? "bg-blue-700" 
                      : "bg-[#2D3B4F] hover:bg-[#374863]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{session.name}</p>
                    <span className="text-xs text-gray-400">
                      {session.messageCount} messages
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {session.lastActive.toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                No conversations yet
              </div>
            )}
          </div>
        )}
      </div>
  
      {/* Suggested Topics */}
      <h2 className="text-xl font-bold mb-4">Suggested Topics</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {suggestedTopics.map((topic, index) => (
          <div 
            key={index}
            onClick={() => handleTopicClick(topic)}
            className="bg-[#2D3B4F] p-2 rounded-lg text-xs cursor-pointer hover:bg-[#374863] transition-colors"
          >
            {topic}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;