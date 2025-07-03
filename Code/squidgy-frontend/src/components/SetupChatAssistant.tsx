// src/components/SetupChatAssistant.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, ArrowRight, Calendar, Bell, Sun } from 'lucide-react';
import { useAuth } from './Auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface SetupChatAssistantProps {
  agentId: string;
  agentName: string;
  onComplete?: () => void;
}

interface SetupStep {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  data?: any;
}

interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  stepId?: string;
}

const SetupChatAssistant: React.FC<SetupChatAssistantProps> = ({
  agentId,
  agentName,
  onComplete
}) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('welcome');
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize setup steps based on agent type
  useEffect(() => {
    initializeSetupSteps();
    loadExistingProgress();
  }, [agentId]);

  const initializeSetupSteps = () => {
    let steps: SetupStep[] = [];

    if (agentId === 'SOLAgent') {
      steps = [
        {
          id: 'company_info',
          name: 'Company Information',
          description: 'Basic company details and branding',
          icon: <Sun className="w-5 h-5" />,
          completed: false
        },
        {
          id: 'solar_products',
          name: 'Solar Products & Pricing',
          description: 'Panel specifications and pricing',
          icon: <Sun className="w-5 h-5" />,
          completed: false
        },
        {
          id: 'installation_costs',
          name: 'Installation & Labor',
          description: 'Installation costs and labor rates',
          icon: <Sun className="w-5 h-5" />,
          completed: false
        },
        {
          id: 'financing_options',
          name: 'Financing Options',
          description: 'Loan options and incentives',
          icon: <Sun className="w-5 h-5" />,
          completed: false
        },
        {
          id: 'calendar_setup',
          name: 'Calendar Setup',
          description: 'Appointment scheduling and availability',
          icon: <Calendar className="w-5 h-5" />,
          completed: false
        },
        {
          id: 'notifications',
          name: 'Notification Preferences',
          description: 'Communication channels and preferences',
          icon: <Bell className="w-5 h-5" />,
          completed: false
        }
      ];
    } else {
      // Default setup for other agents
      steps = [
        {
          id: 'basic_config',
          name: 'Basic Configuration',
          description: 'Essential agent settings',
          icon: <Bot className="w-5 h-5" />,
          completed: false
        }
      ];
    }

    setSetupSteps(steps);
    addMessage('assistant', `Hello! I'm here to help you set up your ${agentName}. We'll go through this step by step to ensure everything is configured perfectly for your business. Let's start!`);
    addMessage('assistant', 'First, let me check if you have any existing configuration...');
  };

  const loadExistingProgress = async () => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) return;

      // Check for existing setup data
      const { data: existingSetup } = await supabase
        .from('squidgy_agent_business_setup')
        .select('setup_json')
        .eq('firm_user_id', userIdResult.user_id)
        .eq('agent_id', agentId)
        .single();

      if (existingSetup?.setup_json) {
        const setupData = existingSetup.setup_json;
        updateStepsFromExistingData(setupData);
        addMessage('assistant', 'I found some existing configuration. Let me show you what\'s already set up and what still needs to be done.');
      } else {
        addMessage('assistant', 'No existing configuration found. We\'ll start fresh. Are you ready to begin?');
        setCurrentStep('company_info');
      }
    } catch (error) {
      console.error('Error loading existing progress:', error);
      addMessage('assistant', 'Let\'s start setting up your agent step by step.');
      setCurrentStep('company_info');
    }
  };

  const updateStepsFromExistingData = (setupData: any) => {
    setSetupSteps(prev => prev.map(step => ({
      ...step,
      completed: !!setupData[step.id],
      data: setupData[step.id]
    })));

    // Find first incomplete step
    const firstIncomplete = setupSteps.find(step => !setupData[step.id]);
    if (firstIncomplete) {
      setCurrentStep(firstIncomplete.id);
      addMessage('assistant', `Great! I can see you've completed some steps already. Let's continue with: ${firstIncomplete.name}`);
    } else {
      addMessage('assistant', 'Excellent! It looks like your setup is complete. All steps have been configured.');
      setCurrentStep('complete');
    }
  };

  const addMessage = (type: 'system' | 'user' | 'assistant', content: string, stepId?: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      stepId
    };

    setMessages(prev => [...prev, newMessage]);

    // Save to chat history
    saveToChatHistory(newMessage);
  };

  const saveToChatHistory = async (message: ChatMessage) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) return;

      const sessionId = `${userIdResult.user_id}_${agentId}_setup_${Date.now()}`;

      await supabase
        .from('chat_history')
        .insert({
          user_id: userIdResult.user_id,
          session_id: sessionId,
          agent_id: agentId,
          sender: message.type === 'user' ? 'user' : 'agent',
          message: message.content,
          timestamp: message.timestamp.toISOString(),
          agent_name: agentName
        });
    } catch (error) {
      console.error('Error saving to chat history:', error);
    }
  };

  const handleStepResponse = (stepId: string, response: any) => {
    // Update step as completed
    setSetupSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, completed: true, data: response }
        : step
    ));

    // Add success message
    const step = setupSteps.find(s => s.id === stepId);
    addMessage('assistant', `✅ Great! ${step?.name} has been configured successfully.`, stepId);

    // Move to next step or complete
    const currentIndex = setupSteps.findIndex(s => s.id === stepId);
    const nextStep = setupSteps[currentIndex + 1];

    if (nextStep) {
      setCurrentStep(nextStep.id);
      addMessage('assistant', `Now let's move on to: ${nextStep.name}. ${nextStep.description}`);
    } else {
      setCurrentStep('complete');
      addMessage('assistant', '🎉 Congratulations! Your agent setup is now complete. All systems are configured and ready to go!');
      
      // Save final completion status
      saveCompletionStatus();
      
      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    }
  };

  const saveCompletionStatus = async () => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) return;

      const setupData = setupSteps.reduce((acc, step) => {
        acc[step.id] = step.data || true;
        return acc;
      }, {} as any);

      setupData.completed = true;
      setupData.completed_at = new Date().toISOString();

      await supabase
        .from('squidgy_agent_business_setup')
        .upsert({
          firm_user_id: userIdResult.user_id,
          agent_id: agentId,
          agent_name: agentName,
          is_enabled: true,
          setup_json: setupData
        });

      addMessage('system', 'Setup data has been saved successfully. Your agent is now active!');
    } catch (error) {
      console.error('Error saving completion status:', error);
      addMessage('system', 'Setup completed, but there was an issue saving the data.');
    }
  };

  const renderCurrentStepInput = () => {
    const step = setupSteps.find(s => s.id === currentStep);
    if (!step || step.completed) return null;

    switch (currentStep) {
      case 'company_info':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Company Information</h3>
            <p>Let's start with your company details. What's your company name?</p>
            <input
              type="text"
              placeholder="Enter your company name"
              className="w-full p-3 border rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const value = e.currentTarget.value.trim();
                  addMessage('user', value);
                  handleStepResponse('company_info', { companyName: value });
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        );

      case 'solar_products':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Solar Products & Pricing</h3>
            <p>What types of solar panels do you offer? (e.g., Residential, Commercial)</p>
            <input
              type="text"
              placeholder="Describe your solar panel offerings"
              className="w-full p-3 border rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const value = e.currentTarget.value.trim();
                  addMessage('user', value);
                  handleStepResponse('solar_products', { products: value });
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p>Configuration for {step.name} will be implemented here.</p>
            <button
              onClick={() => handleStepResponse(currentStep, { configured: true })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Mark as Configured
            </button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">{agentName} Setup Assistant</h1>
              <p className="text-blue-100">Let's configure your agent step by step</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            {setupSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  step.completed ? 'text-green-600' : 
                  step.id === currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-green-100' : 
                    step.id === currentStep ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {step.completed ? <CheckCircle className="w-6 h-6" /> : step.icon}
                  </div>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
                {index < setupSteps.length - 1 && (
                  <ArrowRight className="mx-4 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : message.type === 'system'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-50 text-gray-800'
              }`}>
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {/* Current Step Input */}
        {currentStep !== 'complete' && (
          <div className="p-6 border-t bg-gray-50">
            {renderCurrentStepInput()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupChatAssistant;