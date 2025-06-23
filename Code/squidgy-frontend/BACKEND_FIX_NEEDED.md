# Backend Fix Required: Chat History Sender Field

## Issue
The backend `save_to_history` method is causing database constraint violations because it's not setting the `sender` field when inserting chat history.

## Error
```
null value in column "sender" of relation "chat_history" violates not-null constraint
```

## Root Cause
The `save_to_history` method in `main.py` (line 218) is trying to save both user message and agent response in a single database row, but it's not setting the `sender` field:

```python
entry = {
    'session_id': session_id,
    'user_id': user_id,
    'user_message': user_message,      # ✅ Set
    'agent_response': agent_response,  # ✅ Set  
    'timestamp': datetime.now().isoformat()
    # ❌ Missing: 'sender' field
}
```

## Recommended Fix

Replace the `save_to_history` method in `/Users/somasekharaddakula/CascadeProjects/SquidgyBackend/main.py` with:

```python
async def save_to_history(self, session_id: str, user_id: str, user_message: str, agent_response: str):
    """Save message to chat history - creates separate entries for user and agent"""
    try:
        # Save user message
        if user_message and user_message.strip():
            user_entry = {
                'session_id': session_id,
                'user_id': user_id,
                'sender': 'user',
                'message': user_message,
                'user_message': user_message,
                'timestamp': datetime.now().isoformat()
            }
            
            result1 = self.supabase.table('chat_history')\
                .insert(user_entry)\
                .execute()
        
        # Save agent response  
        if agent_response and agent_response.strip():
            agent_entry = {
                'session_id': session_id,
                'user_id': user_id,
                'sender': 'agent',
                'message': agent_response,
                'agent_response': agent_response,
                'timestamp': datetime.now().isoformat()
            }
            
            result2 = self.supabase.table('chat_history')\
                .insert(agent_entry)\
                .execute()
        
        return True
        
    except Exception as e:
        logger.error(f"Error saving to history: {str(e)}")
        return None
```

## Alternative Quick Fix (if you want to keep single row approach)

```python
async def save_to_history(self, session_id: str, user_id: str, user_message: str, agent_response: str):
    """Save message to chat history"""
    try:
        entry = {
            'session_id': session_id,
            'user_id': user_id,
            'sender': 'conversation',  # or 'system'
            'message': f"User: {user_message}\nAgent: {agent_response}",
            'user_message': user_message,
            'agent_response': agent_response,
            'timestamp': datetime.now().isoformat()
        }
        
        result = self.supabase.table('chat_history')\
            .insert(entry)\
            .execute()
        
        return result.data[0] if result.data else None
        
    except Exception as e:
        logger.error(f"Error saving to history: {str(e)}")
        return None
```

## Immediate Workaround
Run the SQL in `fix_sender_column.sql` to fix existing null sender values.