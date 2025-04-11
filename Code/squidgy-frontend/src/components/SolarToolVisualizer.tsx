// SolarToolVisualizer.tsx
import React, { useState, useEffect } from 'react';
import { MapPin, Sun, FileDown, Download, Image as ImageIcon } from 'lucide-react';

interface SolarToolVisualizerProps {
    tool: string;
    executionId: string;
    params: any;
    result: any;
    status: 'pending' | 'executing' | 'complete' | 'error';
    animationState: 'idle' | 'initializing' | 'processing' | 'success' | 'error';
  }

const SolarToolVisualizer: React.FC<SolarToolVisualizerProps> = ({
  tool,
  executionId,
  params,
  result,
  status,
  animationState
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Common container classes
  const containerClasses = "relative p-4 bg-slate-800 rounded-lg mb-4 transition-all duration-500";
  
  useEffect(() => {
    // For demo purposes, simulate map loading
    if (tool === 'get_insights' && animationState === 'processing') {
      const timer = setTimeout(() => {
        setMapLoaded(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [tool, animationState]);
  
  // Render based on tool type
  switch (tool) {
    case 'get_insights':
      return (
        <div className={`${containerClasses} border-l-4 border-yellow-500`}>
          <div className="flex items-center mb-2">
            <Sun className="mr-2 text-yellow-400" size={20} />
            <h3 className="text-lg font-medium text-yellow-400">Solar Insights</h3>
          </div>
          
          {animationState === 'initializing' && (
            <div className="flex items-center text-gray-300">
              <div className="animate-pulse w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
              <span>Analyzing address for solar potential...</span>
            </div>
          )}
          
          {animationState === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <span>Analyzing solar potential for {params?.address || 'property'}...</span>
              </div>
              
              {/* Map visualization with pin drop animation */}
              <div className="relative h-64 bg-slate-700 rounded-lg overflow-hidden">
                {/* Placeholder map - in real impl you'd use a mapping library */}
                <div className="absolute inset-0 bg-[url('/map-placeholder.jpg')] bg-cover bg-center opacity-70">
                  {/* Static gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                </div>
                
                {/* Animated pin drop */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-0">
                  <div className={`transition-all duration-1000 ease-bounce ${mapLoaded ? 'translate-y-32' : '-translate-y-16'}`}>
                    <div className="relative">
                      <MapPin size={40} className="text-red-500" />
                      {/* Shadow that grows as pin drops */}
                      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 rounded-full bg-black bg-opacity-30 transition-all duration-1000 ${mapLoaded ? 'w-8 h-2' : 'w-0 h-0'}`}></div>
                    </div>
                  </div>
                </div>
                
                {/* Processing indicator */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{width: mapLoaded ? '80%' : '30%'}}></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {mapLoaded ? 'Calculating solar potential...' : 'Locating property...'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {animationState === 'success' && result && (
        <div className="space-y-3 bg-slate-900 p-3 rounded-md animate-fadeIn">
            {result.solarPotential && (
            <div className="space-y-2">
                <h4 className="text-yellow-400 font-medium">Solar Potential Results</h4>
                <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-gray-400 text-xs">Panel Count</div>
                    <div className="text-white">{result.solarPotential.idealPanelCount || '--'}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-gray-400 text-xs">Yearly Energy</div>
                    <div className="text-white">{result.solarPotential.maxYearlyEnergy ? 
                    `${Math.round(result.solarPotential.maxYearlyEnergy)} kWh` : '--'}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-gray-400 text-xs">Sunshine</div>
                    <div className="text-white">{result.solarPotential.maxSunshineHoursPerYear ?
                    `${Math.round(result.solarPotential.maxSunshineHoursPerYear)} hrs/yr` : '--'}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-gray-400 text-xs">Est. Savings</div>
                    <div className="text-white">{result.solarPotential.estimatedSavings ?
                    `$${Math.round(result.solarPotential.estimatedSavings).toLocaleString()}` : '--'}</div>
                </div>
                </div>
            </div>
            )}
            {result.location && (
            <div className="text-xs text-gray-400 mt-2">
                Location: {result.location.address || 'Property address'}
                {result.location.latitude && result.location.longitude && 
                ` (${result.location.latitude.toFixed(5)}, ${result.location.longitude.toFixed(5)})`}
            </div>
            )}
            </div>
          )}
          
          {animationState === 'error' && (
            <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
              Error analyzing solar potential. Please check the address and try again.
            </div>
          )}
        </div>
      );
    
    case 'get_datalayers':
      return (
        <div className={`${containerClasses} border-l-4 border-green-500`}>
          <div className="flex items-center mb-2">
            <ImageIcon className="mr-2 text-green-400" size={20} />
            <h3 className="text-lg font-medium text-green-400">Solar Data Layers</h3>
          </div>
          
          {animationState === 'initializing' && (
            <div className="flex items-center text-gray-300">
              <div className="animate-pulse w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <span>Initializing solar analysis visualization...</span>
            </div>
          )}
          
          {animationState === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <span>Generating solar data visualizations...</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(index => (
                  <div key={index} className="h-40 bg-slate-700 rounded-md overflow-hidden relative flex items-center justify-center">
                    <div className="animate-pulse">
                      <ImageIcon size={32} className="text-slate-600" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" style={{
                      width: `${Math.min(100, index * 25)}%`,
                      transition: 'width 1s ease-in-out'
                    }}></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
                    // Update the success section for get_datalayers to handle the new data format:
            {animationState === 'success' && result && (
            <div className="animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                {result.layers && result.layers.length > 0 ? (
                    result.layers.map((layer: any, index: number) => (
                    <div key={index} className="relative">
                        <div className="h-40 bg-slate-700 rounded-md overflow-hidden">
                        {layer.imageUrl && (
                            <img 
                            src={layer.imageUrl} 
                            alt={layer.name || `Layer ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                console.error('Error loading image:', e);
                                e.currentTarget.src = '/fallback-image.jpg';
                            }}
                            />
                        )}
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs p-1 rounded">
                        {layer.name || `Layer ${index + 1}`}
                        </div>
                    </div>
                    ))
                ) : (
                    <div className="col-span-2 p-3 bg-slate-900 rounded-md text-gray-300">
                    No layer images available. The API may not have returned image data.
                    </div>
                )}
                </div>
                
                {result.expiresOn && (
                <div className="mt-3 p-2 bg-slate-900 rounded-md text-xs text-gray-400">
                    Images expire on: {new Date(result.expiresOn).toLocaleDateString()}
                </div>
                )}
            </div>
            )}
          
          {animationState === 'error' && (
            <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
              Error generating solar data layers. Please try again later.
            </div>
          )}
        </div>
      );
    
    case 'get_report':
      return (
        <div className={`${containerClasses} border-l-4 border-blue-500`}>
          <div className="flex items-center mb-2">
            <FileDown className="mr-2 text-blue-400" size={20} />
            <h3 className="text-lg font-medium text-blue-400">Solar Report</h3>
          </div>
          
          {animationState === 'initializing' && (
            <div className="flex items-center text-gray-300">
              <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
              <span>Initializing report generation...</span>
            </div>
          )}
          
          {animationState === 'processing' && (
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                <span>Generating comprehensive solar report...</span>
              </div>
              
              {/* Document assembly animation */}
              <div className="flex justify-center py-5">
                <div className="relative w-24 h-32">
                  {/* Animated pages stacking */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-white rounded-md shadow-md transform rotate-[-3deg] transition-all duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-white rounded-md shadow-md transform translate-y-[-5px] rotate-[2deg] transition-all duration-500 delay-100"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-white rounded-md shadow-md transform translate-y-[-10px] transition-all duration-700 delay-200 flex items-center justify-center">
                    <Sun size={32} className="text-yellow-500 opacity-20" />
                  </div>
                  
                  {/* Progress indicator */}
                  <div className="absolute bottom-[-20px] left-0 right-0 text-center text-xs text-gray-400">
                    Compiling data...
                  </div>
                </div>
              </div>
              
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-[loading_3s_ease-in-out]" style={{width: '75%'}}></div>
              </div>
            </div>
          )}
          
          // Update the success section for get_report to handle the new data format:
            {animationState === 'success' && result && (
            <div className="animate-fadeIn">
                <div className="bg-slate-900 p-3 rounded-md">
                <div className="flex items-center justify-between mb-3">
                    <div>
                    <h4 className="text-white font-medium">Solar Analysis Report</h4>
                    <p className="text-gray-400 text-sm">Property: {params?.address || 'Your property'}</p>
                    </div>
                    
                    <div className="relative">
                    <div className="relative w-12 h-16 bg-white rounded-sm shadow-md flex items-center justify-center">
                        <Sun size={20} className="text-yellow-500 opacity-30" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"></div>
                    </div>
                </div>
                
                {result.summary && (
                    <div className="mb-4 p-2 bg-slate-800 rounded-md text-sm text-gray-300">
                    {result.summary}
                    </div>
                )}
                
                {result.reportUrl ? (
                    <a 
                    href={result.reportUrl} 
                    target="_blank"
                    rel="noopener noreferrer"
                    download="solar-report.pdf"
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors w-full"
                    >
                    <Download size={16} className="mr-2" />
                    Download Full Report
                    </a>
                ) : (
                    <div className="text-sm text-gray-400 italic">
                    Report URL not available.
                    </div>
                )}
                
                {result.expiresOn && (
                    <div className="mt-2 text-xs text-gray-500">
                    Report expires on: {new Date(result.expiresOn).toLocaleDateString()}
                    </div>
                )}
                </div>
            </div>
            )}
          
          {animationState === 'error' && (
            <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
              Error generating solar report. Please try again later.
            </div>
          )}
        </div>
      );
    
    default:
      return null;
  }
};

export default SolarToolVisualizer;