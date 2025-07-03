// src/components/SetupChatAssistant.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, ArrowRight, Calendar, Bell, Sun, Settings, Star, DollarSign, Wrench, CreditCard, Building } from 'lucide-react';
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
  questions: StepQuestion[];
  currentQuestionIndex: number;
}

interface StepQuestion {
  id: string;
  question: string;
  placeholder: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
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
          icon: <Settings className="w-5 h-5" />,
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'company_name', question: 'What is your company name?', placeholder: 'Enter your company name', type: 'text', required: true },
            { id: 'business_address', question: 'What is your business address?', placeholder: 'Enter your business address', type: 'text', required: true },
            { id: 'phone_number', question: 'What is your business phone number?', placeholder: 'Enter phone number', type: 'text', required: true },
            { id: 'email', question: 'What is your business email address?', placeholder: 'Enter business email', type: 'text', required: true },
            { id: 'website', question: 'What is your company website?', placeholder: 'Enter website URL', type: 'text', required: false },
            { id: 'license_number', question: 'What is your solar contractor license number?', placeholder: 'Enter license number', type: 'text', required: true },
            { id: 'years_in_business', question: 'How many years has your company been in business?', placeholder: 'Enter number of years', type: 'number', required: true },
            { id: 'service_areas', question: 'What areas do you serve? (cities/regions)', placeholder: 'Enter service areas', type: 'text', required: true },
            { id: 'company_size', question: 'How many employees do you have?', placeholder: 'Enter number of employees', type: 'number', required: true },
            { id: 'certifications', question: 'What certifications does your company have?', placeholder: 'Enter certifications (NABCEP, etc.)', type: 'text', required: false },
            { id: 'insurance_info', question: 'What is your liability insurance coverage amount?', placeholder: 'Enter insurance coverage', type: 'text', required: true },
            { id: 'warranty_offered', question: 'What warranty do you offer on installations?', placeholder: 'Enter warranty details', type: 'text', required: true },
            { id: 'business_hours', question: 'What are your business hours?', placeholder: 'e.g., Mon-Fri 8AM-6PM', type: 'text', required: true }
          ]
        },
        {
          id: 'solar_products',
          name: 'Solar Products & Pricing',
          description: 'Panel specifications and pricing',
          icon: <Star className="w-5 h-5" />,
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'panel_brands', question: 'What solar panel brands do you offer?', placeholder: 'Enter panel brands', type: 'text', required: true },
            { id: 'panel_wattage', question: 'What wattage options do you provide?', placeholder: 'e.g., 300W, 350W, 400W', type: 'text', required: true },
            { id: 'cost_per_watt', question: 'What is your cost per watt?', placeholder: 'Enter cost per watt', type: 'number', required: true },
            { id: 'inverter_types', question: 'What inverter types do you offer?', placeholder: 'String, Power Optimizers, Microinverters', type: 'text', required: true },
            { id: 'battery_options', question: 'Do you offer battery storage options?', placeholder: 'Yes/No and which brands', type: 'text', required: true }
          ]
        },
        {
          id: 'installation_costs',
          name: 'Installation & Labor',
          description: 'Installation costs and labor rates',
          icon: <Wrench className="w-5 h-5" />,
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'labor_cost', question: 'What is your labor cost per hour?', placeholder: 'Enter hourly rate', type: 'number', required: true },
            { id: 'installation_time', question: 'How long does a typical installation take?', placeholder: 'e.g., 1-2 days', type: 'text', required: true },
            { id: 'permits_included', question: 'Are permits included in your pricing?', placeholder: 'Yes/No', type: 'text', required: true }
          ]
        },
        {
          id: 'financing_options',
          name: 'Financing Options',
          description: 'Loan options and incentives',
          icon: <CreditCard className="w-5 h-5" />,
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'financing_partners', question: 'What financing partners do you work with?', placeholder: 'Enter financing companies', type: 'text', required: true },
            { id: 'loan_terms', question: 'What loan terms do you offer?', placeholder: 'e.g., 10, 15, 20 years', type: 'text', required: true },
            { id: 'down_payment', question: 'What down payment is required?', placeholder: 'Enter percentage or amount', type: 'text', required: true }
          ]
        },
        {
          id: 'calendar_setup',
          name: 'Calendar Setup',
          description: 'Appointment scheduling and availability',
          icon: <Calendar className="w-5 h-5" />,
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'consultation_duration', question: 'How long are your consultations?', placeholder: 'e.g., 60 minutes', type: 'text', required: true },
            { id: 'available_days', question: 'What days are you available for consultations?', placeholder: 'e.g., Monday-Friday', type: 'text', required: true },
            { id: 'time_slots', question: 'What time slots do you offer?', placeholder: 'e.g., 9AM-5PM', type: 'text', required: true }
          ]
        },
        {
          id: 'notifications',
          name: 'Notification Preferences',
          description: 'Communication channels and preferences',
          icon: <Bell className="w-5 h-5" />,
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'email_notifications', question: 'Do you want email notifications for new leads?', placeholder: 'Yes/No', type: 'text', required: true },
            { id: 'sms_notifications', question: 'Do you want SMS notifications?', placeholder: 'Yes/No', type: 'text', required: true },
            { id: 'notification_frequency', question: 'How often do you want notifications?', placeholder: 'Immediate, Daily, Weekly', type: 'text', required: true }
          ]
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
          completed: false,
          currentQuestionIndex: 0,
          questions: [
            { id: 'agent_name', question: 'What would you like to call this agent?', placeholder: 'Enter agent name', type: 'text', required: true }
          ]
        }
      ];
    }

    setSetupSteps(steps);
    addMessage('assistant', `Hello! I'm here to help you set up your ${agentName}. We'll go through this step by step to ensure everything is configured perfectly for your business.`);
    addMessage('assistant', 'Let me check if you have any existing configuration first...');
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
        const firstStep = setupSteps[0];
        if (firstStep) {
          setCurrentStep(firstStep.id);
          setTimeout(() => {
            addMessage('assistant', `Let's start with: ${firstStep.name}`);
            addMessage('assistant', `Question 1/${firstStep.questions.length}: ${firstStep.questions[0].question}`);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error loading existing progress:', error);
      addMessage('assistant', 'Let\'s start setting up your agent step by step.');
      const firstStep = setupSteps[0];
      if (firstStep) {
        setCurrentStep(firstStep.id);
        setTimeout(() => {
          addMessage('assistant', `Question 1/${firstStep.questions.length}: ${firstStep.questions[0].question}`);
        }, 500);
      }
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

  const handleQuestionResponse = (questionId: string, response: string) => {
    const currentStepData = setupSteps.find(s => s.id === currentStep);
    if (!currentStepData) return;

    const currentQuestion = currentStepData.questions[currentStepData.currentQuestionIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) return;

    setIsProcessing(true);

    // Save the response
    const updatedSteps = setupSteps.map(step => {
      if (step.id === currentStep) {
        const newData = { ...step.data, [questionId]: response };
        const nextQuestionIndex = step.currentQuestionIndex + 1;
        
        // Check if we've completed all questions for this step
        if (nextQuestionIndex >= step.questions.length) {
          // Step completed - all questions answered
          addMessage('assistant', `✅ Excellent! You've completed all ${step.questions.length} questions for ${step.name}.`);
          addMessage('assistant', `${step.name} setup is now complete with all your business information saved.`);
          
          // Move to next step
          setTimeout(() => {
            setIsProcessing(false);
            moveToNextStep(step.id, newData);
          }, 1500);
          
          return { ...step, data: newData, completed: true };
        } else {
          // Move to next question in the same step
          const nextQuestion = step.questions[nextQuestionIndex];
          setTimeout(() => {
            addMessage('assistant', `Great! Question ${nextQuestionIndex + 1}/${step.questions.length}: ${nextQuestion.question}`);
            setIsProcessing(false);
          }, 500);
          
          return { 
            ...step, 
            data: newData, 
            currentQuestionIndex: nextQuestionIndex 
          };
        }
      }
      return step;
    });

    setSetupSteps(updatedSteps);
  };

  const moveToNextStep = (completedStepId: string, stepData: any) => {
    const currentIndex = setupSteps.findIndex(s => s.id === completedStepId);
    const nextStep = setupSteps[currentIndex + 1];

    if (nextStep) {
      setCurrentStep(nextStep.id);
      addMessage('assistant', `🎯 Now let's move on to the next phase: ${nextStep.name}`);
      addMessage('assistant', `${nextStep.description}`);
      addMessage('assistant', `Question 1/${nextStep.questions.length}: ${nextStep.questions[0].question}`);
    } else {
      setCurrentStep('complete');
      addMessage('assistant', '🎉 Congratulations! Your Solar Sales Specialist setup is now complete!');
      addMessage('assistant', 'All 6 phases have been configured with your business information. Your agent is ready to help customers with solar consultations!');
      
      // Save final completion status
      saveCompletionStatus();
      
      if (onComplete) {
        setTimeout(onComplete, 3000);
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

    const currentQuestion = step.questions[step.currentQuestionIndex];
    if (!currentQuestion) return null;

    const handleSubmit = (value: string) => {
      if (!value.trim()) return;
      
      addMessage('user', value);
      handleQuestionResponse(currentQuestion.id, value.trim());
      setUserInput('');
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step.icon}
            <h3 className="font-semibold">{step.name}</h3>
          </div>
          <span className="text-sm text-gray-500">
            Question {step.currentQuestionIndex + 1} of {step.questions.length}
          </span>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-medium text-gray-800 mb-3">{currentQuestion.question}</p>
          
          {currentQuestion.type === 'select' ? (
            <select
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userInput.trim()) {
                  handleSubmit(userInput);
                }
              }}
            >
              <option value="">Select an option...</option>
              {currentQuestion.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={currentQuestion.type}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userInput.trim()) {
                  handleSubmit(userInput);
                }
              }}
              disabled={isProcessing}
            />
          )}
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-500">
              {currentQuestion.required ? 'Required field' : 'Optional'}
            </span>
            <button
              onClick={() => handleSubmit(userInput)}
              disabled={!userInput.trim() || isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? 'Processing...' : 'Submit'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Progress bar for current step */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step.currentQuestionIndex + 1) / step.questions.length) * 100}%` }}
          />
        </div>
      </div>
    );
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