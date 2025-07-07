// src/components/EnhancedChatSolarSetup.tsx
'use client';

import React, { useState } from 'react';
import { Sun, DollarSign, MapPin, Check } from 'lucide-react';
import { SolarBusinessConfig } from '@/config/solarBusinessConfig';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface EnhancedChatSolarSetupProps {
  onConfigurationComplete: (config: SolarBusinessConfig) => void;
  onSkip: () => void;
  sessionId?: string;
}

const EnhancedChatSolarSetup: React.FC<EnhancedChatSolarSetupProps> = ({
  onConfigurationComplete,
  onSkip,
  sessionId
}) => {
  const [isSaving, setSaving] = useState(false);
  
  // Enhanced solar configuration with more comprehensive defaults
  const [config, setConfig] = useState<Partial<SolarBusinessConfig>>({
    company_name: "Solar Solutions Inc.",
    cost_per_watt: 3.50,
    state: "CA",
    federal_tax_credit: 30,
    state_incentive: 1000,
    financing_options: ["cash", "loan", "lease"],
    warranty_years: 25,
    efficiency_rating: 20.5,
    installation_cost_per_watt: 0.75,
    markup_percentage: 20,
    local_energy_rate: 0.28
  });

  const handleFieldChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveToDatabase = async (solarConfig: Partial<SolarBusinessConfig>, sessionId?: string) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Save to unified squidgy_agent_business_setup table - FIXED v2
      const insertData = {
        firm_id: null, // Explicitly set as null
        firm_user_id: userIdResult.user_id,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'SolarSetup',
        setup_json: solarConfig,
        session_id: sessionId && sessionId.includes('_') ? null : sessionId,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🔧 SOLAR INSERT DATA:', insertData);
      console.log('🔧 setup_type value:', insertData.setup_type);
      console.log('🔧 session_id value:', insertData.session_id);
      
      const { data, error } = await supabase
        .from('squidgy_agent_business_setup')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database save error:', error);
        throw error;
      }

      console.log('✅ Solar configuration saved to database:', data);
      return data;
    } catch (error) {
      console.error('Failed to save solar configuration:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    if (saving) return; // Prevent multiple rapid submissions
    
    try {
      setSaving(true);
      
      // Save to database
      await saveToDatabase(config, sessionId);
      
      // Save to localStorage as backup
      localStorage.setItem('solar_configuration', JSON.stringify(config));
      
      setSaving(false);
      onConfigurationComplete(config as SolarBusinessConfig);
    } catch (error) {
      console.error('Failed to complete solar setup:', error);
      setSaving(false);
      // Still call onComplete to not block the user
      onConfigurationComplete(config as SolarBusinessConfig);
    }
  };

  const states = [
    { value: "CA", label: "California", incentive: 1000 },
    { value: "TX", label: "Texas", incentive: 500 },
    { value: "FL", label: "Florida", incentive: 750 },
    { value: "NY", label: "New York", incentive: 1200 },
    { value: "AZ", label: "Arizona", incentive: 800 },
    { value: "NV", label: "Nevada", incentive: 900 },
    { value: "NC", label: "North Carolina", incentive: 600 },
    { value: "NJ", label: "New Jersey", incentive: 1100 }
  ];

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4 max-w-sm">
      <div className="flex items-center mb-4">
        <Sun className="text-orange-500 mr-2" size={20} />
        <h3 className="font-semibold text-gray-800">Solar Business Setup</h3>
      </div>
      
      <div className="space-y-4 mb-4">
        {/* Company Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={14} className="inline mr-1" />
            Company Name
          </label>
          <input
            type="text"
            value={config.company_name}
            onChange={(e) => handleFieldChange('company_name', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
            placeholder="Solar Solutions Inc."
          />
        </div>

        {/* Pricing Configuration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign size={14} className="inline mr-1" />
              Cost per Watt ($)
            </label>
            <input
              type="number"
              value={config.cost_per_watt}
              onChange={(e) => handleFieldChange('cost_per_watt', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
              step="0.01"
              placeholder="3.50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
            <input
              type="number"
              value={config.markup_percentage}
              onChange={(e) => handleFieldChange('markup_percentage', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
              placeholder="20"
            />
          </div>
        </div>

        {/* Location & Incentives */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State/Region</label>
          <select
            value={config.state}
            onChange={(e) => {
              const selectedState = states.find(s => s.value === e.target.value);
              handleFieldChange('state', e.target.value);
              if (selectedState) {
                handleFieldChange('state_incentive', selectedState.incentive);
              }
            }}
            className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
          >
            {states.map(state => (
              <option key={state.value} value={state.value}>
                {state.label} (${state.incentive} incentive)
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white p-3 rounded-md border">
          <h4 className="font-medium text-gray-800 mb-2">System Specifications</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-gray-600 mb-1">Efficiency (%)</label>
              <input
                type="number"
                value={config.efficiency_rating}
                onChange={(e) => handleFieldChange('efficiency_rating', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded text-xs text-gray-900 bg-white"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Warranty (years)</label>
              <input
                type="number"
                value={config.warranty_years}
                onChange={(e) => handleFieldChange('warranty_years', parseInt(e.target.value))}
                className="w-full px-2 py-1 border rounded text-xs text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="bg-orange-50 p-3 rounded border">
          <h4 className="font-medium text-gray-800 mb-2">Configuration Summary</h4>
          <div className="space-y-1 text-xs text-gray-700">
            <div>• {config.company_name}</div>
            <div>• ${config.cost_per_watt}/watt + {config.markup_percentage}% markup</div>
            <div>• {states.find(s => s.value === config.state)?.label} (${config.state_incentive} incentive)</div>
            <div>• {config.efficiency_rating}% efficiency, {config.warranty_years}yr warranty</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          disabled={isSaving}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Check size={14} className="mr-1" />
              Complete Setup
            </>
          )}
        </button>
        
        <button
          onClick={onSkip}
          className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatSolarSetup;