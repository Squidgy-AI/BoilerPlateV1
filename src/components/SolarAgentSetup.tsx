// src/components/SolarAgentSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Zap, ArrowRight } from 'lucide-react';
import SolarChatConfig from './SolarChatConfig';
import { SolarBusinessConfig, getSolarConfig, getSolarConfigAsync } from '@/config/solarBusinessConfig';

interface SolarAgentSetupProps {
  onConfigurationComplete: (config: SolarBusinessConfig) => void;
  onSkip: () => void;
}

const SolarAgentSetup: React.FC<SolarAgentSetupProps> = ({
  onConfigurationComplete,
  onSkip
}) => {
  const [showChatConfig, setShowChatConfig] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for existing configuration from database or localStorage
  useEffect(() => {
    const checkExistingConfig = async () => {
      try {
        // Check localStorage first for quick response
        const savedLocalConfig = localStorage.getItem('solarBusinessConfig');
        
        // Try to get from database using the same pattern as chat history
        const config = await getSolarConfigAsync();
        
        // User has existing config if we have saved data (not just defaults)
        setHasExistingConfig(!!savedLocalConfig);
      } catch (error) {
        console.error('Error checking existing config:', error);
        // Fallback to localStorage check only
        const savedConfig = localStorage.getItem('solarBusinessConfig');
        setHasExistingConfig(!!savedConfig);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingConfig();
  }, []);

  const handleStartConfiguration = () => {
    setShowChatConfig(true);
  };

  const handleConfigComplete = (config: SolarBusinessConfig) => {
    setShowChatConfig(false);
    setHasExistingConfig(true);
    onConfigurationComplete(config);
  };

  const handleConfigSkip = () => {
    setShowChatConfig(false);
    onSkip();
  };

  const handleUseExistingConfig = async () => {
    const config = await getSolarConfigAsync();
    onConfigurationComplete(config);
  };

  if (showChatConfig) {
    return (
      <SolarChatConfig
        onComplete={handleConfigComplete}
        onSkip={handleConfigSkip}
      />
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6 mb-4">
      <div className="flex items-start space-x-4">
        <div className="bg-orange-500 rounded-full p-3 flex-shrink-0">
          <Zap className="text-white" size={24} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Welcome to Solar Sales Specialist! 🌞
          </h3>
          
          <p className="text-gray-700 mb-4 leading-relaxed">
            To provide you with accurate solar calculations and personalized recommendations, 
            I need to know about your business parameters. This quick setup will help me:
          </p>
          
          <ul className="space-y-2 text-gray-700 mb-6">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Calculate accurate pricing for your solar installations</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Provide financing options tailored to your terms</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Generate savings projections based on local energy rates</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Apply correct incentives and tax credits</span>
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            {hasExistingConfig ? (
              <>
                <button
                  onClick={handleUseExistingConfig}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <span>Use Existing Configuration</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={handleStartConfiguration}
                  className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Settings size={18} />
                  <span>Update Configuration</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartConfiguration}
                className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Settings size={18} />
                <span>Start Quick Setup (13 questions)</span>
              </button>
            )}
            
            <button
              onClick={onSkip}
              className="flex items-center justify-center space-x-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <span>Skip for Now</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-3">
            💡 You can always access this setup later through the chat by saying "configure solar business"
          </p>
        </div>
      </div>
    </div>
  );
};

export default SolarAgentSetup;