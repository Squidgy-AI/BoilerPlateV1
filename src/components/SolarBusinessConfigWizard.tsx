// src/components/SolarBusinessConfigWizard.tsx
// 
// COMMENTED OUT - MODAL WIZARD DESIGN (Can be restored later if needed)
// This is the full-screen modal wizard with step-by-step categories
// Replaced with chat-based inline configuration for better UX
//
/*
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Settings, X } from 'lucide-react';
import {
  SOLAR_BUSINESS_PARAMETERS,
  CATEGORY_INFO,
  SolarBusinessConfig,
  SolarBusinessParameter,
  getSolarConfig,
  saveSolarConfig,
  formatParameterValue,
  getParametersByCategory
} from '@/config/solarBusinessConfig';

interface SolarBusinessConfigWizardProps {
  onComplete: (config: SolarBusinessConfig) => void;
  onCancel: () => void;
}

const SolarBusinessConfigWizard: React.FC<SolarBusinessConfigWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<SolarBusinessConfig>(getSolarConfig());
  const [isValid, setIsValid] = useState(true);

  const categories = Object.keys(CATEGORY_INFO);
  const currentCategory = categories[currentStep];
  const currentParameters = getParametersByCategory(currentCategory);
  const totalSteps = categories.length;

  // Validate current step
  useEffect(() => {
    const requiredParams = currentParameters.filter(p => p.required);
    const allValid = requiredParams.every(param => {
      const value = config[param.key as keyof SolarBusinessConfig];
      if (param.type === 'boolean') {
        return value !== undefined;
      }
      return value !== undefined && value !== null && value !== '';
    });
    setIsValid(allValid);
  }, [config, currentParameters]);

  const handleParameterChange = (paramKey: string, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [paramKey]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step - save and complete
      saveSolarConfig(config);
      onComplete(config);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderParameterInput = (param: SolarBusinessParameter) => {
    const value = config[param.key as keyof SolarBusinessConfig];

    if (param.type === 'boolean') {
      return (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleParameterChange(param.key, true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              value === true
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Enabled
          </button>
          <button
            onClick={() => handleParameterChange(param.key, false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              value === false
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Disabled
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <input
          type="number"
          value={value as number}
          onChange={(e) => handleParameterChange(param.key, parseFloat(e.target.value) || 0)}
          min={param.min}
          max={param.max}
          step={param.step}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          placeholder={`Default: ${param.defaultValue}`}
        />
        <div className="flex justify-between text-sm text-gray-600">
          <span>Current: {formatParameterValue(param, value as number)}</span>
          <span>Default: {formatParameterValue(param, param.defaultValue as number)}</span>
        </div>
      </div>
    );
  };

  const categoryInfo = CATEGORY_INFO[currentCategory as keyof typeof CATEGORY_INFO];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{categoryInfo?.icon}</div>
              <div>
                <h2 className="text-2xl font-bold">Solar Business Setup</h2>
                <p className="text-orange-100">
                  Step {currentStep + 1} of {totalSteps}: {categoryInfo?.title}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-orange-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-orange-100 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-orange-400 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {categoryInfo?.title}
            </h3>
            <p className="text-gray-600">{categoryInfo?.description}</p>
          </div>

          <div className="space-y-6">
            {currentParameters.map((param) => (
              <div key={param.key} className="bg-gray-50 rounded-lg p-4">
                <div className="mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-800">{param.name}</h4>
                    {param.required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                </div>
                {renderParameterInput(param)}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            {categories.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!isValid}
            className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <span>{currentStep === totalSteps - 1 ? 'Complete Setup' : 'Next'}</span>
            {currentStep === totalSteps - 1 ? (
              <Check size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolarBusinessConfigWizard;
*/

// TEMPORARY EXPORT TO PREVENT BUILD ERRORS
// Remove this when chat-based config is implemented
export default function SolarBusinessConfigWizard() {
  return null;
}