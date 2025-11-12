import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  job_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    name: string;
    avatar_url: string;
  };
  receiver?: {
    name: string;
    avatar_url: string;
  };
}

export interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const useMessages = (otherUserId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      if (otherUserId) {
        fetchMessages(otherUserId);
        subscribeToMessages(otherUserId);
      } else {
        fetchConversations();
      }
    }
  }, [user, otherUserId]);

  const fetchMessages = async (receiverId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!sender_id(name, avatar_url),
          receiver:profiles!receiver_id(name, avatar_url)
        `
        )
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!sender_id(name, avatar_url),
          receiver:profiles!receiver_id(name, avatar_url)
        `
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationMap = new Map<string, Conversation>();

      (data || []).forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            userId: otherUserId,
            userName: otherUser?.name || 'Unknown',
            userAvatar: otherUser?.avatar_url || '',
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount:
              msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
          });
        } else {
          const conv = conversationMap.get(otherUserId)!;
          if (msg.receiver_id === user.id && !msg.is_read) {
            conv.unreadCount++;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = (receiverId: string) => {
    if (!user) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (
            (newMessage.sender_id === user.id &&
              newMessage.receiver_id === receiverId) ||
            (newMessage.sender_id === receiverId &&
              newMessage.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (receiverId: string, content: string, jobId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        job_id: jobId || null,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markConversationAsRead = async (senderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    refetch: otherUserId ? () => fetchMessages(otherUserId) : fetchConversations,
  };
};
