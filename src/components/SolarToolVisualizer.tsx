// src/components/SolarToolVisualizer.tsx
import React from 'react';
import { MapPin, Sun, FileDown } from 'lucide-react';

interface SolarToolVisualizerProps {
  tool: 'get_insights' | 'get_datalayers' | 'get_report';
  executionId: string;
  params: any;
  result: any;
  status: string;
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
  // Common container classes
  const containerClasses = "relative p-4 bg-slate-800 rounded-lg mb-4 transition-all duration-500";
  
  // Format address for display
  const address = params?.address || 'Unknown Address';
  
  // Map tool types to icons and colors
  const getToolInfo = () => {
    switch (tool) {
      case 'get_insights':
        return {
          icon: <Sun className="mr-2 text-yellow-400" size={20} />,
          title: 'Solar Insights',
          color: 'border-yellow-500',
          loadingMessage: 'Analyzing solar potential...'
        };
      case 'get_datalayers':
        return {
          icon: <MapPin className="mr-2 text-green-400" size={20} />,
          title: 'Solar Data Layers',
          color: 'border-green-500',
          loadingMessage: 'Generating visualization layers...'
        };
      case 'get_report':
        return {
          icon: <FileDown className="mr-2 text-blue-400" size={20} />,
          title: 'Solar Report',
          color: 'border-blue-500',
          loadingMessage: 'Generating comprehensive report...'
        };
    }
  };
  
  const toolInfo = getToolInfo();
  
  return (
    <div className={`${containerClasses} border-l-4 ${toolInfo.color}`}>
      <div className="flex items-center mb-2">
        {toolInfo.icon}
        <h3 className="text-lg font-medium text-white">{toolInfo.title}</h3>
      </div>
      
      {/* Initializing State */}
      {animationState === 'initializing' && (
        <div className="flex items-center text-gray-300">
          <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
          <span>Connecting to solar analysis API...</span>
        </div>
      )}
      
      {/* Processing State */}
      {animationState === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center text-gray-300">
            <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
            <span>{toolInfo.loadingMessage}</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
          </div>
          <div className="text-xs text-gray-500">Address: {address}</div>
        </div>
      )}
      
      {/* Success State - Solar Insights */}
      {animationState === 'success' && tool === 'get_insights' && result && (
        <div className="animate-fadeIn">
          {result.solarPotential ? (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-slate-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {result.solarPotential.maxSunshineHoursPerYear?.toLocaleString() || '--'} hrs
                </div>
                <div className="text-gray-300 text-sm">Annual Sunshine</div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {result.solarPotential.idealPanelCount || '--'}
                </div>
                <div className="text-gray-300 text-sm">Recommended Panels</div>
              </div>
              {result.solarPotential.estimatedSavings && (
                <div className="col-span-2 bg-slate-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">
                    ${result.solarPotential.estimatedSavings.toLocaleString()}
                  </div>
                  <div className="text-gray-300 text-sm">Lifetime Savings</div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-700 p-3 rounded-md text-center text-gray-300">
              Solar analysis completed for {address}
            </div>
          )}
        </div>
      )}
      
      {/* Success State - Solar Data Layers */}
      {animationState === 'success' && tool === 'get_datalayers' && result && (
        <div className="animate-fadeIn">
          {result.layers && result.layers.length > 0 ? (
            <div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {result.layers.slice(0, 4).map((layer, index) => (
                  <div key={index} className="bg-slate-700 rounded-md overflow-hidden h-24">
                    {layer.imageUrl ? (
                      <img 
                        src={layer.imageUrl}
                        alt={layer.name || `Layer ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                        {layer.name || `Layer ${index + 1}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center text-xs text-gray-400">
                {result.layers.length} visualization layers generated
              </div>
            </div>
          ) : (
            <div className="bg-slate-700 p-3 rounded-md text-center text-gray-300">
              Data layers generated for {address}
            </div>
          )}
        </div>
      )}
      
      {/* Success State - Solar Report */}
      {animationState === 'success' && tool === 'get_report' && result && (
        <div className="animate-fadeIn">
          <div className="bg-slate-700 p-4 rounded-lg mt-2">
            {result.reportUrl ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-white font-medium">Solar Report</div>
                  <a 
                    href={result.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                  >
                    <FileDown size={14} className="mr-1" />
                    Download
                  </a>
                </div>
                {result.summary && (
                  <div className="text-gray-300 text-sm">
                    {result.summary}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-300">
                Solar report generated for {address}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Error State */}
      {animationState === 'error' && (
        <div className="bg-red-900 bg-opacity-30 p-3 rounded-md text-red-300">
          Error during solar analysis. Please try again.
          {result?.error && (
            <div className="mt-2 text-xs">
              Details: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SolarToolVisualizer;