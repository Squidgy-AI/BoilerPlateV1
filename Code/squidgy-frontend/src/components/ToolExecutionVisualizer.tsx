import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Globe, Camera, Image as ImageIcon, Calendar, User, Building, Database } from 'lucide-react';
import SolarToolVisualizer from './SolarToolVisualizer';


interface ToolExecutionProps {
  websocket: WebSocket | null;
  currentRequestId: string | null;
  isProcessing: boolean;
}

// Define tool execution types and their visual representation
type ToolType = 
  | 'perplexity' 
  | 'capture_website_screenshot' 
  | 'get_website_favicon' 
  | 'insights' 
  | 'datalayers' 
  | 'report'
  | 'calendar'
  | 'appointment'
  | 'contact'
  | 'user'
  | 'sub_account'
  | 'analyze_with_perplexity';

interface ToolExecution {
  id: string;
  tool: ToolType;
  status: 'pending' | 'executing' | 'complete' | 'error';
  startTime: number;
  endTime?: number;
  params?: any;
  result?: any;
  progress?: number;
}

// Custom hook for tool execution animations
function useToolAnimation(toolExecution: ToolExecution | null) {
  const [animationState, setAnimationState] = useState<
    'idle' | 'initializing' | 'processing' | 'success' | 'error'
  >('idle');
  
  useEffect(() => {
    if (!toolExecution) {
      setAnimationState('idle');
      return;
    }
    
    setAnimationState('initializing');
    
    const initTimer = setTimeout(() => {
      setAnimationState('processing');
      
      const processingTimer = setTimeout(() => {
        setAnimationState(toolExecution.status === 'error' ? 'error' : 'success');
        
        // Reset to idle after showing results
        const resetTimer = setTimeout(() => {
          setAnimationState('idle');
        }, 120000);
        
        return () => clearTimeout(resetTimer);
      }, 2000);
      
      return () => clearTimeout(processingTimer);
    }, 800);
    
    return () => clearTimeout(initTimer);
  }, [toolExecution]);
  
  return animationState;
}

const ToolExecutionVisualizer: React.FC<ToolExecutionProps> = ({
  websocket,
  currentRequestId,
  isProcessing
}) => {
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<ToolExecution | null>(null);
  const animationState = useToolAnimation(currentExecution);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get backend URL from environment or use default
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  const backendUrl = `https://${apiBase}`;

  // ADD THIS USEEFFECT HERE
  useEffect(() => {
    console.log("ToolExecutionVisualizer rendered with:", { 
      currentRequestId, 
      isProcessing,
      backendUrl,
      websocket: websocket ? "Connected" : "Disconnected" 
    });
  }, [currentRequestId, isProcessing, backendUrl, websocket]);
  
  // Listen for WebSocket tool execution events
  useEffect(() => {
    if (!websocket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message in ToolVisualizer:", data);
        
        // Only process relevant tool execution events
        if (data.requestId === currentRequestId) {
          if (data.type === 'tool_execution') {
            // Extract tool type from tool property
            const toolType = data.tool || 'unknown';
            const executionId = data.executionId || `${toolType}-${Date.now()}`;
            
            console.log(`Tool execution started: ${toolType} (${executionId})`);
            
            // Add new tool execution
            const newExecution: ToolExecution = {
              id: executionId,
              tool: toolType as ToolType,
              status: 'executing',
              startTime: Date.now(),
              params: data.params
            };
            
            setExecutions(prev => [...prev, newExecution]);
            setCurrentExecution(newExecution);
          }
          else if (data.type === 'tool_result') {
            // Log all data for debugging
            console.log("Tool result full data:", data);
            
            // Find the tool execution by tool name or execution ID
            let executionId = data.executionId;
            let toolName = data.tool;
            
            if (!toolName && executionId) {
              // Try to extract tool name from execution ID (e.g. "screenshot-12345")
              const parts = executionId.split('-');
              if (parts.length > 0) {
                toolName = parts[0];
              }
            }
            
            console.log(`Processing tool result for: ${toolName} (${executionId})`);
            
            // Process image paths
            let processedResult = {...data.result};
            if (toolName === 'capture_website_screenshot' || toolName === 'get_website_favicon') {
              if (typeof processedResult === 'string') {
                processedResult = { path: processedResult };
              }
              
              // Original path handling for debugging
              const originalPath = processedResult?.path;
              console.log("Original path from backend:", originalPath);
              
              if (processedResult && typeof processedResult.path === 'string') {
                // Add backend URL to paths if they don't already have it
                let filename = processedResult.path;
                  if (filename.includes('/')) {
                    filename = filename.split('/').pop();
                  }

                  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
                  if (toolName === 'capture_website_screenshot') {
                    processedResult.path = `https://${apiBase}/static/screenshots/${filename}`;
                  } else {
                    processedResult.path = `https://${apiBase}/static/favicons/${filename}`;
                  }
              } else {
                // Set a default empty path if path is not a string
                processedResult.path = '';
                console.warn("Image path is not a string:", processedResult?.path);
              }

              // Debug logging
              console.log("Processing image path for:", toolName);
              console.log("Backend URL:", backendUrl);
              console.log("Final processed path:", processedResult.path);
            }
            
            // First try to find by execution ID
            let executionIndex = -1;
            if (executionId) {
              executionIndex = executions.findIndex(ex => ex.id === executionId);
            }
            
            // If not found by ID, try to find by tool name
            if (executionIndex < 0 && toolName) {
              executionIndex = executions.findIndex(ex => ex.tool === toolName);
            }
            
            if (executionIndex >= 0) {
              // Update existing execution with results
              setExecutions(prev => 
                prev.map((ex, idx) => 
                  idx === executionIndex
                    ? { 
                      ...ex, 
                      status: data.error ? 'error' : 'complete',
                      endTime: Date.now(),
                      result: processedResult
                    } 
                    : ex
                )
              );
              
              // Update current execution if it matches
              if (currentExecution && 
                  (currentExecution.id === executionId || currentExecution.tool === toolName)) {
                setCurrentExecution(prev => 
                  prev
                    ? { 
                      ...prev, 
                      status: data.error ? 'error' : 'complete',
                      endTime: Date.now(),
                      result: processedResult
                    }
                    : prev
                );
              }
            } else {
              // If we couldn't find an existing execution, create a new one
              console.log("Creating new execution for tool result:", toolName);
              const newExecution: ToolExecution = {
                id: executionId || `${toolName}-${Date.now()}`,
                tool: toolName as ToolType,
                status: 'complete',
                startTime: Date.now() - 3000, // Backdate a bit to show it ran quickly
                endTime: Date.now(),
                result: processedResult
              };
              
              setExecutions(prev => [...prev, newExecution]);
              setCurrentExecution(newExecution);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message in ToolVisualizer:", error);
      }
    };
    
    websocket.addEventListener('message', handleMessage);
    
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket, currentRequestId, executions, currentExecution, backendUrl]);
  
  // Render tool execution visualization
  const renderToolVisualization = () => {
    if (!currentExecution) return null;
    
    // Common classes for tool visualization container
    const containerClasses = "relative p-4 bg-slate-800 rounded-lg mb-4 transition-all duration-500";
    
    // Map tool names correctly
    const toolType = (() => {
      if (currentExecution.tool === 'analyze_with_perplexity') return 'perplexity';
      return currentExecution.tool;
    })();
    
    // Render different visualizations based on tool type
    switch (toolType) {
      case 'perplexity':
        return (
          <div className={`${containerClasses} border-l-4 border-blue-500`}>
            <div className="flex items-center mb-2">
              <Globe className="mr-2 text-blue-400" size={20} />
              <h3 className="text-lg font-medium text-blue-400">Website Analysis</h3>
            </div>
            
            {animationState === 'initializing' && (
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                <span>Connecting to Perplexity API...</span>
              </div>
            )}
            
            {animationState === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center text-gray-300">
                  <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                  <span>Analyzing website content...</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
                </div>
                <div className="text-xs text-gray-500">URL: {currentExecution.params?.url}</div>
              </div>
            )}
            
            {animationState === 'success' && currentExecution.result && (
              <div className="space-y-3 bg-slate-900 p-3 rounded-md">
                <div className="animate-fadeIn">
                  {currentExecution.result.analysis && currentExecution.result.analysis.split('\n').map((line: string, index: number) => {
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
              </div>
            )}
            
            {animationState === 'error' && (
              <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
                Error analyzing website. Please try again.
              </div>
            )}
          </div>
        );

      case 'get_insights':
      case 'insights':
        return (
              <SolarToolVisualizer
                tool="get_insights"
                executionId={currentExecution.id}
                params={currentExecution.params}
                result={currentExecution.result}
                status={currentExecution.status}
                animationState={animationState}
              />
      );
          
      case 'get_datalayers':
      case 'datalayers':
        return (
              <SolarToolVisualizer
                tool="get_datalayers"
                executionId={currentExecution.id}
                params={currentExecution.params}
                result={currentExecution.result}
                status={currentExecution.status}
                animationState={animationState}
              />
        );
          
      case 'get_report':
      case 'report':
        return (
              <SolarToolVisualizer
                tool="get_report"
                executionId={currentExecution.id}
                params={currentExecution.params}
                result={currentExecution.result}
                status={currentExecution.status}
                animationState={animationState}
              />
        );
        
      // Inside ToolExecutionVisualizer.tsx
      // Find the case 'capture_website_screenshot': section and replace it with this improved version

      case 'capture_website_screenshot':
        return (
          <div className={`${containerClasses} border-l-4 border-green-500`}>
            <div className="flex items-center mb-2">
              <Camera className="mr-2 text-green-400" size={20} />
              <h3 className="text-lg font-medium text-green-400">Website Screenshot</h3>
            </div>
            
            {animationState === 'initializing' && (
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <span>Initializing headless browser...</span>
              </div>
            )}
            
            {animationState === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center text-gray-300">
                  <div className="animate-pulse w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                  <span>Capturing screenshot of {currentExecution.params?.url}...</span>
                </div>
                <div className="relative h-40 bg-gray-800 rounded-md overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera size={32} className="text-gray-600 animate-pulse" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 animate-[loading_3s_ease-in-out]"></div>
                </div>
              </div>
            )}
            
            {animationState === 'success' && currentExecution.result && (
              <div className="animate-fadeIn">
                <div className="relative h-48 bg-gray-800 rounded-md overflow-hidden">
                  <div className="relative w-full h-full">
                    {currentExecution.result.path ? (
                      <img 
                        src={apiBase ? 
                          `https://${apiBase}/static/screenshots/${currentExecution.result.path}` : 
                          `/static/screenshots/${currentExecution.result.path}`}
                        alt="Website Screenshot"
                        className="object-contain w-full h-full"
                        onError={(e) => {
                          console.error('Error loading screenshot:', e);
                          // Add cache-busting parameter
                          const target = e.target as HTMLImageElement;
                          const currentSrc = target.src;
                          target.src = `${currentSrc}?t=${Date.now()}`;
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No screenshot available
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    Captured: {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  {currentExecution.result.path ? 
                    `Screenshot saved successfully` : 
                    "Screenshot path not available"}
                </div>
              </div>
            )}
            
            {animationState === 'error' && (
              <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
                Error capturing screenshot. 
                {currentExecution.result?.message && (
                  <div className="mt-2 text-xs">
                    Details: {currentExecution.result.message}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      case 'get_website_favicon':
        return (
          <div className={`${containerClasses} border-l-4 border-purple-500`}>
            <div className="flex items-center mb-2">
              <ImageIcon className="mr-2 text-purple-400" size={20} />
              <h3 className="text-lg font-medium text-purple-400">Website Favicon</h3>
            </div>
            
            {animationState === 'initializing' && (
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                <span>Scanning website for favicon...</span>
              </div>
            )}
            
            {animationState === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center text-gray-300">
                  <div className="animate-pulse w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                  <span>Extracting favicon from {currentExecution.params?.url}...</span>
                </div>
                <div className="flex justify-center py-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center">
                    <ImageIcon size={24} className="text-gray-600 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            
            {animationState === 'success' && currentExecution.result && (
              <div className="animate-fadeIn flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-md overflow-hidden flex items-center justify-center">
                  {currentExecution.result.path && (
                    <img 
                      src={currentExecution.result.path + `?t=${Date.now()}`}
                      alt="Website Favicon"
                      className="max-w-full max-h-full"
                      onError={(e) => {
                        console.error('Error loading favicon:', e);
                        // Add timestamp to force reload
                        const target = e.target as HTMLImageElement;
                        target.src = `${currentExecution.result.path}?t=${Date.now()}`;
                      }}
                    />
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  <div>Favicon extracted successfully</div>
                  <div>Path: {currentExecution.result.path}</div>
                </div>
              </div>
            )}
            
            {animationState === 'error' && (
              <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
                Error extracting favicon. The website may not have a favicon.
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <div className={`${containerClasses} border-l-4 border-gray-500`}>
            <div className="flex items-center mb-2">
              <Database className="mr-2 text-gray-400" size={20} />
              <h3 className="text-lg font-medium text-gray-400">{currentExecution.tool} Tool</h3>
            </div>
            
            {animationState === 'initializing' && (
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                <span>Initializing tool...</span>
              </div>
            )}
            
            {animationState === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center text-gray-300">
                  <div className="animate-pulse w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                  <span>Processing...</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
                </div>
              </div>
            )}
            
            {animationState === 'success' && (
              <div className="bg-gray-900 p-3 rounded-md text-gray-300">
                Tool execution completed successfully
              </div>
            )}
            
            {animationState === 'error' && (
              <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
                Error executing tool
              </div>
            )}
          </div>
        );
    }
  };
  
  // Don't render if no execution or not processing
  if (!currentExecution && executions.length === 0) {
    return null;
  }
  
  // Main render
  return (
    <div className="absolute top-20 left-6 right-6 z-20 max-h-[60%] overflow-auto">
      {renderToolVisualization()}
      
      {/* Tool execution timeline/history for multiple executions */}
      {executions.length > 1 && (
        <div className="mt-2 mb-4 bg-[#2D3B4F] p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Execution History</h4>
          <div className="flex overflow-x-auto space-x-2 pb-2">
            {executions.map((execution, index) => (
              <div 
                key={execution.id}
                onClick={() => setCurrentExecution(execution)}
                className={`flex-shrink-0 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  currentExecution?.id === execution.id 
                    ? 'bg-slate-700 border-l-4 border-blue-500' 
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  {execution.tool === 'perplexity' && <Globe size={16} className="text-blue-400 mr-2" />}
                  {execution.tool === 'capture_website_screenshot' && <Camera size={16} className="text-green-400 mr-2" />}
                  {execution.tool === 'get_website_favicon' && <ImageIcon size={16} className="text-purple-400 mr-2" />}
                  
                  <span className="text-xs">
                    {execution.tool}
                  </span>
                </div>
                
                <div className="mt-1 flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    execution.status === 'complete' ? 'bg-green-500' :
                    execution.status === 'error' ? 'bg-red-500' :
                    execution.status === 'executing' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-500'
                  }`}></div>
                  <span className="text-xs text-gray-400">
                    {execution.endTime 
                      ? `${Math.round((execution.endTime - execution.startTime) / 1000)}s`
                      : 'In progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolExecutionVisualizer;