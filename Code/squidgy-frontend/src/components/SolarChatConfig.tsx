// src/components/SolarChatConfig.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Check, Zap } from 'lucide-react';
import {
  SOLAR_BUSINESS_PARAMETERS,
  SolarBusinessConfig,
  SolarBusinessParameter,
  getSolarConfig,
  saveSolarConfig,
  formatParameterValue
} from '@/config/solarBusinessConfig';

interface SolarChatConfigProps {
  onComplete: (config: SolarBusinessConfig) => void;
  onSkip: () => void;
}

const SolarChatConfig: React.FC<SolarChatConfigProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [config, setConfig] = useState<SolarBusinessConfig>(getSolarConfig());
  const [isCompleted, setIsCompleted] = useState(false);

  const currentParameter = SOLAR_BUSINESS_PARAMETERS[currentQuestionIndex];
  const totalQuestions = SOLAR_BUSINESS_PARAMETERS.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleParameterChange = (paramKey: string, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [paramKey]: value
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Save configuration and complete
      saveSolarConfig(config);
      setIsCompleted(true);
      setTimeout(() => {
        onComplete(config);
      }, 2000); // Show completion message for 2 seconds
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const getCurrentValue = () => {
    return config[currentParameter.key as keyof SolarBusinessConfig];
  };

  const renderInput = () => {
    const value = getCurrentValue();

    if (currentParameter.type === 'boolean') {
      return (
        <div className="flex space-x-3 mt-3">
          <button
            onClick={() => handleParameterChange(currentParameter.key, true)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              value === true
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ✅ Enabled
          </button>
          <button
            onClick={() => handleParameterChange(currentParameter.key, false)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              value === false
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ❌ Disabled
          </button>
        </div>
      );
    }

    return (
      <div className="mt-3">
        <div className="flex items-center space-x-3">
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleParameterChange(currentParameter.key, parseFloat(e.target.value) || 0)}
            min={currentParameter.min}
            max={currentParameter.max}
            step={currentParameter.step}
            className="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
            placeholder={`Default: ${currentParameter.defaultValue}`}
          />
          <span className="text-gray-600 font-medium">
            {currentParameter.unit || ''}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>Current: {formatParameterValue(currentParameter, value as number)}</span>
          <span>Default: {formatParameterValue(currentParameter, currentParameter.defaultValue as number)}</span>
        </div>
      </div>
    );
  };

  if (isCompleted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 mb-4">
        <div className="text-center">
          <div className="bg-green-500 rounded-full p-4 inline-flex items-center justify-center mb-4">
            <Check className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            🎉 Setup Complete!
          </h3>
          <p className="text-green-700 text-lg">
            Thanks for filling out your solar business configuration! 
            SOL Agent has been set up successfully for your business.
          </p>
          <div className="mt-4 text-green-600">
            You can now get accurate pricing, financing options, and savings calculations! 🌞⚡
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6 mb-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 rounded-full p-2 flex-shrink-0">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Solar Business Setup</h3>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Progress</div>
          <div className="text-lg font-bold text-orange-600">
            {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-orange-200 rounded-full h-2 mb-6">
        <div
          className="bg-orange-500 rounded-full h-2 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">
          {currentParameter.name}
          {currentParameter.required && <span className="text-red-500 ml-1">*</span>}
        </h4>
        <p className="text-gray-600 leading-relaxed">
          {currentParameter.description}
        </p>
        
        {/* Input Area */}
        {renderInput()}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          Skip Setup
        </button>

        <button
          onClick={handleNext}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <span>{isLastQuestion ? 'FINISH' : 'NEXT'}</span>
          {isLastQuestion ? (
            <Check size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </div>

      {/* Category Info */}
      <div className="mt-4 pt-4 border-t border-orange-200">
        <div className="text-xs text-gray-500">
          Category: <span className="font-medium capitalize">{currentParameter.category}</span>
          {currentParameter.min !== undefined && currentParameter.max !== undefined && (
            <span className="ml-4">
              Range: {formatParameterValue(currentParameter, currentParameter.min)} - {formatParameterValue(currentParameter, currentParameter.max)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolarChatConfig;