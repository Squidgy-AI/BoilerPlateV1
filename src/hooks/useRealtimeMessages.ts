// src/hooks/useRealtimeMessages.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useRealtimeMessages = (
  sessionId: string,
  isGroup: boolean
) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);

    // Initial fetch of messages
    const fetchMessages = async () => {
      try {
        if (isGroup) {
          const { data, error } = await supabase
            .from('group_messages')
            .select('*, sender:sender_id(full_name, avatar_url)')
            .eq('group_id', sessionId)
            .order('timestamp', { ascending: true });

          if (error) throw error;
          setMessages(data || []);
        } else {
          const { data, error } = await supabase
            .from('messages')
            .select('*, sender:sender_id(full_name, avatar_url), recipient:recipient_id(full_name, avatar_url)')
            .or(`sender_id.eq.${sessionId},recipient_id.eq.${sessionId}`)
            .order('timestamp', { ascending: true });

          if (error) throw error;
          setMessages(data || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscriptions
    const subscription = isGroup
      ? supabase
          .channel('group_messages_channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'group_messages',
              filter: `group_id=eq.${sessionId}`
            },
            async (payload) => {
              // Fetch full message with sender info
              const { data } = await supabase
                .from('group_messages')
                .select('*, sender:sender_id(full_name, avatar_url)')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                setMessages(prev => [...prev, data]);
              }
            }
          )
          .subscribe()
      : supabase
          .channel('direct_messages_channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `or(sender_id.eq.${sessionId},recipient_id.eq.${sessionId})`
            },
            async (payload) => {
              // Fetch full message with sender and recipient info
              const { data } = await supabase
                .from('messages')
                .select('*, sender:sender_id(full_name, avatar_url), recipient:recipient_id(full_name, avatar_url)')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                setMessages(prev => [...prev, data]);
              }
            }
          )
          .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [sessionId, isGroup]);

  return { messages, loading };
};