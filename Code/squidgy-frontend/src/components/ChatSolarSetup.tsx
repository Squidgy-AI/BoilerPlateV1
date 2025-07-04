// src/components/ChatSolarSetup.tsx
'use client';

import React, { useState } from 'react';
import { Settings, Zap, ArrowRight, Sun } from 'lucide-react';
import { SolarBusinessConfig } from '@/config/solarBusinessConfig';

interface ChatSolarSetupProps {
  onConfigurationComplete: (config: SolarBusinessConfig) => void;
  onSkip: () => void;
}

const ChatSolarSetup: React.FC<ChatSolarSetupProps> = ({
  onConfigurationComplete,
  onSkip
}) => {
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleStartConfiguration = () => {
    setIsConfiguring(true);
  };

  const handleConfigComplete = (config: SolarBusinessConfig) => {
    setIsConfiguring(false);
    onConfigurationComplete(config);
  };

  const handleSkipSetup = () => {
    onSkip();
  };

  if (isConfiguring) {
    // Simple chat-based configuration
    return (
      <div className="bg-white rounded-lg border p-4 max-w-sm">
        <div className="flex items-center mb-3">
          <Sun className="text-orange-500 mr-2" size={20} />
          <h3 className="font-semibold text-gray-800">Quick Solar Setup</h3>
        </div>
        
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Company Name</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
              defaultValue="Solar Solutions Inc."
              placeholder="Enter company name"
            />
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1">Cost per Watt ($)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
              defaultValue="3.50"
              placeholder="3.50"
              step="0.01"
            />
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1">State/Region</label>
            <select className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white">
              <option value="">Select your state...</option>
              <option value="CA" selected>California</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
              <option value="NY">New York</option>
              <option value="AZ">Arizona</option>
              <option value="NV">Nevada</option>
              <option value="NC">North Carolina</option>
              <option value="NJ">New Jersey</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handleConfigComplete({
              company_name: "Solar Solutions Inc.",
              cost_per_watt: 3.50,
              state: "CA"
            } as SolarBusinessConfig)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Complete Setup
          </button>
          <button
            onClick={handleSkipSetup}
            className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4 max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="bg-orange-500 rounded-full p-2 flex-shrink-0">
          <Sun className="text-white" size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Solar Sales Setup 🌞
          </h3>
          
          <p className="text-gray-700 text-sm mb-3 leading-relaxed">
            Let's configure your solar business parameters for accurate quotes and calculations.
          </p>
          
          <ul className="space-y-1 text-gray-700 text-sm mb-4">
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></div>
              <span>Pricing & costs</span>
            </li>
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></div>
              <span>Financing options</span>
            </li>
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></div>
              <span>Local incentives</span>
            </li>
          </ul>

          <div className="flex gap-2">
            <button
              onClick={handleStartConfiguration}
              className="flex items-center justify-center space-x-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Settings size={14} />
              <span>Quick Setup</span>
            </button>
            
            <button
              onClick={handleSkipSetup}
              className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
            >
              Skip
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 You can update this later in settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatSolarSetup;