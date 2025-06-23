# Agent Tab Switching Implementation

## Overview
I've implemented automatic agent tab switching when the backend routes a message to a different agent than the one currently selected.

## Changes Made

### 1. Enhanced Dashboard (src/components/Dashboard/EnhancedDashboard.tsx)
- Modified the `handleWebSocketMessage` function to detect when `agent_name` in the response differs from the current agent
- Removed the restriction that only checked for `output_action === 'need_website_info'`
- Now switches agents for ANY case where the response comes from a different agent
- Shows a friendly transition message: "Hey, I'm [Agent Name] and I'll be better able to help you with this. [agent_response]"

### 2. Chatbot Component (src/components/Chatbot.tsx)
- Added `onAgentSwitch` prop to the ChatbotProps interface
- Implemented agent switching logic when receiving n8n responses
- Uses the agent configuration to show friendly agent names in transition messages
- Adds a 1.5 second delay before showing the actual response

## How It Works

1. **User sends message** to Lead Gen Specialist
2. **Backend routes** to Pre-Sales Consultant (returns `agent_name: "presaleskb"`)
3. **Frontend detects** the agent mismatch
4. **Automatically switches** to Pre-Sales Consultant tab
5. **Loads** Pre-Sales avatar
6. **Shows transition message**: "Hey, I'm Pre-Sales Consultant and I'll be better able to help you with this."
7. **Displays** the actual agent response

## Example Response Handling
```json
{
  "agent_name": "presaleskb",
  "output_action": "need_website_info",
  "agent_response": "Please provide your website URL to continue"
}
```

The system will:
- Detect that "presaleskb" is different from current agent
- Switch to Pre-Sales Consultant tab
- Show transition message
- Display the agent response

## Testing
1. Select Lead Gen Specialist
2. Ask a technical question that should be handled by Pre-Sales
3. Observe automatic tab switch and transition message
4. Verify the correct avatar loads

## Notes
- The agent switching is based on the `agent_name` field in the backend response
- The system uses the agent configuration to map agent IDs to friendly names
- Avatar switching happens automatically with the tab switch
- The transition message provides a smooth user experience