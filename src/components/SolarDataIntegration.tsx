import React, { useState, useEffect } from 'react';
import { MapPin, Sun } from 'lucide-react';

// Custom Tree SVG component 
const TreeIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22v-7l-2-2" />
    <path d="M17 8v.8A6 6 0 0 1 13.8 20v0H10v0A6.5 6.5 0 0 1 7 8h0a5 5 0 0 1 10 0Z" />
    <path d="m14 14-2 2" />
  </svg>
);

// Custom Home SVG component
const HomeIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// Define props interface for SolarVisualizer
interface SolarVisualizerProps {
  address: string;
  data: {
    annualProduction?: number;
    recommendedSystemSize?: number;
    estimatedSavings?: number;
    roofArea?: number;
    treeShading?: number;
    panelCount?: number;
    mapImageUrl?: string;
  };
  visualizationType: 'insights' | 'datalayers' | 'report';
  isLoading?: boolean;
}

const SolarVisualizer = ({ 
  address, 
  data, 
  visualizationType, 
  isLoading = false 
}: SolarVisualizerProps) => {
  const [animationStage, setAnimationStage] = useState(0);
  const [showInsights, setShowInsights] = useState(false);
  const [showPanels, setShowPanels] = useState(false);
  const [showTrees, setShowTrees] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  
  // Demo values if not provided
  const {
    annualProduction = 12450,
    recommendedSystemSize = 8.5,
    estimatedSavings = 1850,
    roofArea = 900,
    treeShading = 15,
    panelCount = 24,
    mapImageUrl = '/api/placeholder/800/600' // Using placeholder API
  } = data;
  
  // Progress through animation stages
  useEffect(() => {
    if (isLoading) {
      // Reset animations
      setAnimationStage(0);
      setShowInsights(false);
      setShowPanels(false);
      setShowTrees(false);
      setReportReady(false);
      return;
    }
    
    // Start animation sequence
    const timer1 = setTimeout(() => {
      setAnimationStage(1); // Map pin drops
      
      const timer2 = setTimeout(() => {
        setAnimationStage(2); // Address found
        
        const timer3 = setTimeout(() => {
          if (visualizationType === 'insights') {
            setShowInsights(true);
          } else if (visualizationType === 'datalayers') {
            setShowTrees(true);
            
            const timer4 = setTimeout(() => {
              setShowPanels(true);
            }, 1000);
            
            return () => clearTimeout(timer4);
          } else if (visualizationType === 'report') {
            setReportReady(true);
          }
        }, 1000);
        
        return () => clearTimeout(timer3);
      }, 1500);
      
      return () => clearTimeout(timer2);
    }, 1000);
    
    return () => clearTimeout(timer1);
  }, [isLoading, visualizationType]);
  
  // Generate styles for solar panels layout
  const generatePanelStyles = () => {
    // This would be dynamic based on real data
    const panels = [];
    
    if (!showPanels) return panels;
    
    // Create a simple grid pattern for demo
    const rows = 4;
    const cols = 6;
    const panelWidth = 12;
    const panelHeight = 6;
    const startX = 150; // Position on "roof"
    const startY = 100;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Skip some panels to make it look more natural
        if (r === 0 && c === 0) continue;
        if (r === 0 && c === 5) continue;
        if (r === 3 && c === 0) continue;
        
        const delay = (r * cols + c) * 0.1;
        
        panels.push(
          <div 
            key={`panel-${r}-${c}`}
            className="absolute bg-blue-500 bg-opacity-60 border border-blue-600 rounded"
            style={{
              left: `${startX + c * panelWidth}px`,
              top: `${startY + r * panelHeight}px`,
              width: `${panelWidth}px`,
              height: `${panelHeight}px`,
              opacity: 0, // Start invisible
            }}
          />
        );
      }
    }
    
    return panels;
  };
  
  // Generate tree shading visualization
  const generateTreeShading = () => {
    if (!showTrees) return null;
    
    const trees = [];
    
    // Position some trees around the property
    const treePositions = [
      { x: 80, y: 60, size: 20 },
      { x: 60, y: 140, size: 24 },
      { x: 240, y: 180, size: 18 },
      { x: 300, y: 70, size: 22 }
    ];
    
    treePositions.forEach((tree, index) => {
      trees.push(
        <div 
          key={`tree-${index}`}
          className="absolute flex items-center justify-center"
          style={{
            left: `${tree.x}px`,
            top: `${tree.y}px`,
            width: `${tree.size}px`,
            height: `${tree.size}px`,
            opacity: 0,
          }}
        >
          <TreeIcon size={tree.size} className="text-green-600" />
          {/* Tree shadow */}
          <div 
            className="absolute bg-black bg-opacity-20 rounded-full"
            style={{
              width: `${tree.size * 3}px`,
              height: `${tree.size * 3}px`,
              transform: `translate(${tree.size/2}px, ${tree.size/2}px)`,
            }}
          />
        </div>
      );
    });
    
    return trees;
  };
  
  return (
    <div className="bg-slate-800 rounded-lg p-4 w-full max-w-2xl mx-auto">
      <div className="flex items-center mb-4">
        <MapPin className="mr-2 text-yellow-400" size={20} />
        <h3 className="text-lg font-medium text-yellow-400">
          {visualizationType === 'insights' ? 'Solar Insights' : 
           visualizationType === 'datalayers' ? 'Solar Data Layers' : 
           'Solar Report'}
        </h3>
      </div>
      
      {/* Map visualization */}
      <div className="relative h-64 bg-gray-800 rounded-md overflow-hidden mb-4">
        {/* Map background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mapImageUrl})` }}
        ></div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <div className="text-white">Analyzing address...</div>
          </div>
        )}
        
        {/* House outline */}
        {animationStage >= 1 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32">
            <div className="absolute inset-0 border-2 border-white border-opacity-60 rounded"></div>
            
            {/* Roof outline for solar panels */}
            <div className="absolute inset-0 flex items-center justify-center">
              <HomeIcon size={64} className="text-white text-opacity-60" />
            </div>
          </div>
        )}
        
        {/* Address pin */}
        {animationStage >= 1 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <MapPin size={20} className="text-black" />
            </div>
            {/* Animated ripple effect */}
            <div className="absolute inset-0 w-8 h-8 bg-yellow-500 rounded-full opacity-75"></div>
          </div>
        )}
        
        {/* Address label */}
        {animationStage >= 2 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {address || '123 Example St, Anytown, USA'}
          </div>
        )}
        
        {/* Solar panel visualization */}
        {generatePanelStyles()}
        
        {/* Tree shading visualization */}
        {generateTreeShading()}
        
        {/* Sun path visualization */}
        {visualizationType === 'datalayers' && showPanels && (
          <div className="absolute top-0 right-0 left-0 h-24 flex justify-end overflow-hidden">
            <div className="relative w-3/4 h-full">
              {/* Sun path arc */}
              <div className="absolute bottom-0 right-0 w-full h-full border-t-4 border-dashed border-yellow-400 rounded-tl-full opacity-50"></div>
              
              {/* Sun position */}
              <div className="absolute bottom-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                <Sun size={24} className="text-yellow-400" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Insights data visualization */}
      {visualizationType === 'insights' && showInsights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{annualProduction.toLocaleString()} kWh</div>
            <div className="text-gray-300 text-sm">Annual Production</div>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{recommendedSystemSize} kW</div>
            <div className="text-gray-300 text-sm">Recommended System</div>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">${estimatedSavings.toLocaleString()}</div>
            <div className="text-gray-300 text-sm">Annual Savings</div>
          </div>
          
          <div className="md:col-span-3 bg-slate-700 p-4 rounded-lg">
            <h4 className="font-medium text-white mb-2">Environmental Impact</h4>
            <div className="h-4 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: '65%' }}
              >
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Carbon Offset: 8.2 tons/year</span>
              <span>Equivalent to planting 120 trees</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Data layers info */}
      {visualizationType === 'datalayers' && showPanels && (
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Roof Analysis</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center mb-1">
                <div className="w-4 h-4 bg-blue-400 rounded-sm mr-2"></div>
                <span className="text-gray-300 text-sm">Panel Layout</span>
              </div>
              <div className="text-white">{panelCount} panels</div>
              <div className="text-gray-400 text-xs">Total Capacity: {recommendedSystemSize} kW</div>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <TreeIcon size={16} className="text-green-400 mr-2" />
                <span className="text-gray-300 text-sm">Tree Shading</span>
              </div>
              <div className="text-white">{treeShading}% impact</div>
              <div className="text-gray-400 text-xs">Minor trimming recommended</div>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <HomeIcon size={16} className="text-orange-400 mr-2" />
                <span className="text-gray-300 text-sm">Roof Area</span>
              </div>
              <div className="text-white">{roofArea} sq ft</div>
              <div className="text-gray-400 text-xs">75% usable space</div>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Sun size={16} className="text-yellow-400 mr-2" />
                <span className="text-gray-300 text-sm">Solar Access</span>
              </div>
              <div className="text-white">92% optimal</div>
              <div className="text-gray-400 text-xs">South-facing exposure</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Report generation visualization */}
      {visualizationType === 'report' && (
        <div className="bg-slate-700 p-4 rounded-lg">
          {!reportReady ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-white">Generating comprehensive report...</div>
              <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-white mb-4">Solar Report Generated</h4>
              <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-white font-medium">SolarReport-{Math.floor(Math.random() * 10000)}.pdf</div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
                    Download
                  </button>
                </div>
                <div className="text-gray-400 text-sm">
                  Complete analysis including financial projections, ROI calculations, and installation guidelines.
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-400">${(estimatedSavings * 25).toLocaleString()}</div>
                  <div className="text-gray-400 text-xs">25-year savings</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-blue-400">4.2 years</div>
                  <div className="text-gray-400 text-xs">Payback period</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-400">22%</div>
                  <div className="text-gray-400 text-xs">IRR</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Call-to-action button */}
      {!isLoading && (animationStage >= 2) && (
        <div className="mt-4 flex justify-center">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-6 py-2 rounded-lg">
            {visualizationType === 'insights' ? 'Schedule Consultation' : 
             visualizationType === 'datalayers' ? 'View Detailed Analysis' : 
             'Download Full Report'}
          </button>
        </div>
      )}
    </div>
  );
};

// Main integration component
const SolarDataIntegration = () => {
  const [currentVisualization, setCurrentVisualization] = useState<'none' | 'insights' | 'datalayers' | 'report'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [solarData, setSolarData] = useState({});
  const [address, setAddress] = useState('123 Solar Avenue, Sunnyville, CA 94000');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    '// WebSocket message simulation',
    '// Tool execution trace:'
  ]);
  
  // Function to simulate executing a solar tool
  const executeSolarTool = (toolType: 'insights' | 'datalayers' | 'report') => {
    setIsLoading(true);
    setCurrentVisualization(toolType);
    
    // Add to console output
    setConsoleOutput(prev => [
      ...prev,
      `> Request sent: ${toolType}(${address})`,
      `> API processing...`
    ]);
    
    // Simulate tool execution and results
    setTimeout(() => {
      setIsLoading(false);
      
      // Set appropriate data based on tool type
      if (toolType === 'insights') {
        const data = {
          annualProduction: 12450,
          recommendedSystemSize: 8.5,
          estimatedSavings: 1850
        };
        setSolarData(data);
        setConsoleOutput(prev => [
          ...prev,
          `> Results received: ${JSON.stringify(data, null, 2)}`,
          `> Visualization rendered successfully`
        ]);
      } else if (toolType === 'datalayers') {
        const data = {
          roofArea: 900,
          treeShading: 15,
          panelCount: 24
        };
        setSolarData(data);
        setConsoleOutput(prev => [
          ...prev,
          `> Results received: ${JSON.stringify(data, null, 2)}`,
          `> Visualization rendered successfully`
        ]);
      } else if (toolType === 'report') {
        const data = {
          reportUrl: '/reports/solar-123.pdf'
        };
        setSolarData(data);
        setConsoleOutput(prev => [
          ...prev,
          `> Results received: ${JSON.stringify(data, null, 2)}`,
          `> Visualization rendered successfully`
        ]);
      }
    }, 3000);
  };
  
  // Keep console scrolled to bottom
  useEffect(() => {
    const consoleElement = document.getElementById('console-output');
    if (consoleElement) {
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  }, [consoleOutput]);
  
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
          <SolarVisualizer 
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
        <div 
          id="console-output"
          className="mt-4 bg-black bg-opacity-50 p-4 rounded-lg font-mono text-xs text-green-400 h-32 overflow-y-auto"
        >
          {consoleOutput.map((line, index) => (
            <div 
              key={index} 
              className={line.startsWith('> ') ? 'opacity-70' : ''}
            >
              {line}
            </div>
          ))}
          {isLoading && (
            <div className="opacity-70">{`> Processing request ${currentVisualization}(${address})...`}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolarDataIntegration;