'use client';

import React, { useState, useEffect } from 'react';
import SolarDataVisualizer from './SolarDataVisualizer';
import ToolExecutionVisualizer from './ToolExecutionVisualizer';

// Mock WebSocket messages for demonstration
const mockMessages = [
  {
    type: 'tool_execution',
    tool: 'insights',
    params: { address: '123 Solar Avenue, Sunnyville, CA 94000' },
    requestId: 'solar-123',
    executionId: 'insights-123'
  },
  {
    type: 'tool_result',
    executionId: 'insights-123',
    result: {
      annualProduction: 12450,
      recommendedSystemSize: 8.5,
      estimatedSavings: 1850
    },
    requestId: 'solar-123'
  },
  {
    type: 'tool_execution',
    tool: 'datalayers',
    params: { address: '123 Solar Avenue, Sunnyville, CA 94000' },
    requestId: 'solar-123',
    executionId: 'datalayers-123'
  },
  {
    type: 'tool_result',
    executionId: 'datalayers-123',
    result: {
      roofArea: 900,
      treeShading: 15,
      panelCount: 24
    },
    requestId: 'solar-123'
  },
  {
    type: 'tool_execution',
    tool: 'report',
    params: { address: '123 Solar Avenue, Sunnyville, CA 94000' },
    requestId: 'solar-123',
    executionId: 'report-123'
  },
  {
    type: 'tool_result',
    executionId: 'report-123',
    result: {
      reportUrl: '/reports/solar-123.pdf'
    },
    requestId: 'solar-123'
  }
];

const SolarFunctionsDemo = () => {
  const [currentVisualization, setCurrentVisualization] = useState<'none' | 'insights' | 'datalayers' | 'report'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [solarData, setSolarData] = useState({});
  const [address, setAddress] = useState('123 Solar Avenue, Sunnyville, CA 94000');
  
  // Function to simulate executing a solar tool
  const executeSolarTool = (toolType: 'insights' | 'datalayers' | 'report') => {
    setIsLoading(true);
    setCurrentVisualization(toolType);
    
    // Simulate tool execution and results
    setTimeout(() => {
      setIsLoading(false);
      
      // Set appropriate data based on tool type
      if (toolType === 'insights') {
        setSolarData({
          annualProduction: 12450,
          recommendedSystemSize: 8.5,
          estimatedSavings: 1850
        });
      } else if (toolType === 'datalayers') {
        setSolarData({
          roofArea: 900,
          treeShading: 15,
          panelCount: 24
        });
      } else if (toolType === 'report') {
        setSolarData({
          reportUrl: '/reports/solar-123.pdf'
        });
      }
    }, 3000);
  };
  
  return (
    <div className="bg-slate-900 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Solar Analysis Tools</h1>
        
        {/* Address input */}
        <div className="mb-6">
          <label className="block text-white mb-2">Property Address</label>
          <div className="flex">
            <input 
              type="text" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-l-lg border border-slate-700"
              placeholder="Enter property address"
            />
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
              onClick={() => executeSolarTool('insights')}
              disabled={isLoading}
            >
              Analyze
            </button>
          </div>
        </div>
        
        {/* Tool selection buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg ${
              currentVisualization === 'insights' 
                ? 'bg-yellow-500 text-black' 
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            onClick={() => executeSolarTool('insights')}
            disabled={isLoading}
          >
            Solar Insights
          </button>
          
          <button 
            className={`px-4 py-2 rounded-lg ${
              currentVisualization === 'datalayers' 
                ? 'bg-yellow-500 text-black' 
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            onClick={() => executeSolarTool('datalayers')}
            disabled={isLoading}
          >
            Solar Data Layers
          </button>
          
          <button 
            className={`px-4 py-2 rounded-lg ${
              currentVisualization === 'report' 
                ? 'bg-yellow-500 text-black' 
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            onClick={() => executeSolarTool('report')}
            disabled={isLoading}
          >
            Generate Report
          </button>
        </div>
        
        {/* Solar Data Visualizer */}
        {currentVisualization !== 'none' && (
          <SolarDataVisualizer 
            address={address}
            data={solarData}
            visualizationType={currentVisualization}
            isLoading={isLoading}
          />
        )}
        
        {/* Explanation of what's happening */}
        <div className="mt-8 bg-slate-800 p-4 rounded-lg text-white">
          <h2 className="text-lg font-medium mb-2">What's happening behind the scenes:</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-300">
            <li>When you click a tool button, a WebSocket message is sent to execute the appropriate solar API function</li>
            <li>The tool_execution event is triggered, showing the execution visualization</li>
            <li>The API processes the address and returns data via a tool_result event</li>
            <li>The Solar Data Visualizer renders the appropriate map and data visualizations</li>
            <li>In a real implementation, this would connect to the actual solar APIs with real data</li>
          </ol>
        </div>
        
        {/* Mini debugging console */}
        <div className="mt-4 bg-black bg-opacity-50 p-4 rounded-lg font-mono text-xs text-green-400 h-32 overflow-y-auto">
          <div>// WebSocket message simulation</div>
          <div>// Tool execution trace:</div>
          {currentVisualization !== 'none' && !isLoading && (
            <>
              <div className="opacity-70">{`> Request sent: ${currentVisualization}(${address})`}</div>
              <div className="opacity-70">{`> API processing...`}</div>
              <div>{`> Results received: ${JSON.stringify(solarData, null, 2)}`}</div>
              <div className="text-yellow-400">{`> Visualization rendered successfully`}</div>
            </>
          )}
          {isLoading && (
            <div className="opacity-70 animate-pulse">{`> Processing request ${currentVisualization}(${address})...`}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolarFunctionsDemo;