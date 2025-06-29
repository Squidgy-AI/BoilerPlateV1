// src/components/EnableAgentPrompt.tsx
'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

interface EnableAgentPromptProps {
  agentName: string;
  agentId: string;
  onEnable: (agentId: string) => void;
  onDecline: () => void;
}

const EnableAgentPrompt: React.FC<EnableAgentPromptProps> = ({
  agentName,
  agentId,
  onEnable,
  onDecline
}) => {
  const handleEnable = () => {
    onEnable(agentId);
  };

  const handleDecline = () => {
    onDecline();
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-blue-800 font-medium">
            Do you want to Enable the {agentName}?
          </p>
          <p className="text-blue-600 text-sm mt-1">
            This will add the {agentName} to your available agents and you can start chatting with it.
          </p>
        </div>
        <div className="flex space-x-3 ml-4">
          <button
            onClick={handleEnable}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label={`Enable ${agentName}`}
          >
            <Check size={18} className="mr-2" />
            YES
          </button>
          <button
            onClick={handleDecline}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Decline enabling agent"
          >
            <X size={18} className="mr-2" />
            NO
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnableAgentPrompt;