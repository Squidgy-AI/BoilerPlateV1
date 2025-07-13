// src/components/Agents/AgentCard.tsx
import React from 'react';
import { Bot, MessageSquare } from 'lucide-react';

interface AgentCardProps {
  id: string;
  name: string;
  avatar: string;
  type: string;
  description: string;
  onClick: (id: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  id,
  name,
  avatar,
  type,
  description,
  onClick
}) => {
  return (
    <div 
      className="relative group bg-[#2D3B4F] hover:bg-[#374863] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg"
      onClick={() => onClick(id)}
    >
      {/* Avatar image */}
      <div className="h-40 overflow-hidden">
        <img 
          src={avatar} 
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = '/agent-fallback.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B2431] to-transparent opacity-70"></div>
      </div>
      
      {/* Agent info */}
      <div className="p-4 pt-3">
        <h3 className="font-bold text-white text-lg mb-1">{name}</h3>
        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{description}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Bot size={16} className="text-blue-400 mr-1" />
            <span className="text-xs text-blue-400">{type}</span>
          </div>
          
          <button 
            className="flex items-center text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md transition-colors"
          >
            <MessageSquare size={12} className="mr-1" />
            Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;