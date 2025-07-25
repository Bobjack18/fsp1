import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send, Plus } from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import Avatar from '@/react-app/components/Avatar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { useUser } from '@/react-app/hooks/useUser';
import type { User, DirectMessageWithUsers } from '@/shared/types';

export default function DirectMessages() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessageWithUsers[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showUserList, setShowUserList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Filter out current user
        const otherUsers = data.filter((u: User) => u.id !== user?.id);
        setUsers(otherUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchMessages = async (userId: number) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/direct-messages/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        // Mark messages as read
        await fetch(`/api/direct-messages/${userId}/read`, { method: 'POST' });
      } else {
        console.error('Failed to fetch messages:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const selectUser = (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setShowUserList(false);
    fetchMessages(selectedUser.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || isSending) return;

    try {
      setIsSending(true);
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: selectedUser.id,
          text: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        // Send notification to recipient (if push notifications enabled)
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: selectedUser.id,
              title: 'New Direct Message',
              message: `New message from ${user?.display_name || user?.email}`,
              type: 'info'
            }),
          });
        } catch (notifError) {
          console.warn('Failed to send notification:', notifError);
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const backToUserList = () => {
    setShowUserList(true);
    setSelectedUser(null);
    setMessages([]);
  };

  if (isLoadingUsers) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBackgroundEffects={false}>
      <div className="container max-w-4xl mx-auto mt-8 h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={selectedUser ? backToUserList : () => navigate('/')}
            className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h2 className="text-2xl font-bold text-accent">
            {selectedUser ? `Chat with ${selectedUser.display_name || selectedUser.email}` : 'Direct Messages'}
          </h2>
          {selectedUser && (
            <button
              onClick={backToUserList}
              className="flex items-center space-x-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New DM</span>
            </button>
          )}
          {!selectedUser && <div className="w-20" />} {/* Spacer */}
        </div>

        {showUserList ? (
          /* User List */
          <div className="bg-black/20 backdrop-blur border border-accent/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-accent mb-4">Select a User</h3>
            {users.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No other users available to message.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className="w-full flex items-center space-x-3 p-3 bg-black/30 hover:bg-black/50 border border-accent/20 hover:border-accent/40 rounded-lg transition-all duration-200"
                  >
                    <Avatar
                      src={user.avatar_url}
                      name={user.display_name || user.email}
                      size="md"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">
                        {user.display_name || user.email.split('@')[0]}
                      </div>
                      <div className="text-sm text-gray-400">
                        {user.email}
                      </div>
                    </div>
                    {user.is_admin && (
                      <div className="bg-accent/20 text-accent text-xs px-2 py-1 rounded">
                        Admin
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Conversation View */
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto bg-black/20 backdrop-blur border border-accent/30 rounded-lg p-4 mb-4 h-96">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="md" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isFromCurrentUser = user && message.sender_id === user.id;
                  const displayUser = isFromCurrentUser ? message.sender : message.recipient;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex mb-4 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isFromCurrentUser 
                          ? 'bg-accent text-black' 
                          : 'bg-gray-700 text-white'
                      }`}>
                        <div className="text-sm font-medium mb-1">
                          {displayUser.display_name || displayUser.email}
                        </div>
                        <div>{message.text}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex space-x-3 items-end">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400 resize-none"
                  rows={2}
                  disabled={isSending}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={isSending || !newMessage.trim()}
                className="bg-accent hover:bg-accent/80 disabled:bg-gray-600 text-black p-3 rounded-lg transition-colors"
              >
                {isSending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
