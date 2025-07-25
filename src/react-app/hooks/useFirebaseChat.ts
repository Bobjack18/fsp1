import { useState, useEffect } from 'react';
import { ref, push, onValue, remove, update, serverTimestamp } from 'firebase/database';
import { database } from '@/firebase/config';
import { useAuth } from '@/react-app/contexts/AuthContext';

export interface FirebaseMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
  };
  address?: string;
}

export function useFirebaseChat(chatType: 'messages' | 'messages_v2') {
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const messagesRef = ref(database, chatType);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const messageList: FirebaseMessage[] = Object.entries(data).map(([id, msg]: [string, any]) => ({
        id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp,
        location: msg.location,
        address: msg.address
      }));
      
      // Sort by timestamp
      messageList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(messageList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatType]);

  const sendMessage = async (text: string, location?: { lat: number; lng: number }, address?: string) => {
    if (!user || !text.trim()) return;

    const messageData: any = {
      text: text.trim(),
      sender: user.displayName || user.email || 'Anonymous',
      timestamp: serverTimestamp()
    };

    if (location) {
      messageData.location = location;
    }

    if (address) {
      messageData.address = address;
    }

    try {
      await push(ref(database, chatType), messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      await remove(ref(database, `${chatType}/${messageId}`));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const updateMessage = async (messageId: string, newText: string) => {
    if (!user || !newText.trim()) return;

    try {
      await update(ref(database, `${chatType}/${messageId}`), {
        text: newText.trim()
      });
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  };

  const canEditOrDelete = (message: FirebaseMessage): boolean => {
    if (!user) return false;
    const isOwnMessage = message.sender === user.displayName || message.sender === user.email;
    return user.isAdmin || isOwnMessage;
  };

  return {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    updateMessage,
    canEditOrDelete
  };
}
