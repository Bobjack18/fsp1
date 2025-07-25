import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send, MapPin, Edit2, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import Avatar from '@/react-app/components/Avatar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { useFirebaseChat, FirebaseMessage } from '@/react-app/hooks/useFirebaseChat';
import { SmallMap, BigMapModal, IncidentReportModal } from '@/react-app/components/MapComponents';

export default function Chat() {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, deleteMessage, updateMessage, canEditOrDelete } = useFirebaseChat('messages');
  
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showBigMap, setShowBigMap] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await sendMessage(newMessage, location || undefined, address || undefined);
      setNewMessage('');
      setLocation(null);
      setAddress('');
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
      handleSendMessage();
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        // Try to get address from coordinates
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          if (data.display_name) {
            setAddress(data.display_name);
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Could not get your location. Please try again.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const startEditing = (message: FirebaseMessage) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  const saveEdit = async () => {
    if (!editText.trim() || !editingMessageId) return;

    try {
      await updateMessage(editingMessageId, editText);
      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Failed to update message. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message. Please try again.');
      }
    }
  };

  const handleMapClick = (location: { lat: number; lng: number }, address?: string) => {
    setSelectedMapLocation({ ...location, address });
    setShowBigMap(true);
  };

  const handleIncidentSubmit = async (description: string, location: { lat: number; lng: number }, address: string, incidentType: string, priority: string, attachments?: File[]) => {
    try {
      const fullDescription = `[${incidentType.toUpperCase()} - ${priority.toUpperCase()} PRIORITY] ${description}`;
      await sendMessage(fullDescription, location, address);
      
      // Log incident details for debugging
      console.log('Incident reported:', { 
        type: incidentType, 
        priority, 
        location, 
        address, 
        attachmentCount: attachments?.length || 0 
      });
    } catch (error) {
      console.error('Error reporting incident:', error);
      alert('Failed to report incident. Please try again.');
    }
  };

  if (isLoading) {
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
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h2 className="text-2xl font-bold text-red-500">Open Calls</h2>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto bg-black/20 backdrop-blur border border-accent/30 rounded-lg p-4 mb-4 h-96">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="md" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
              <AlertTriangle className="w-12 h-12 text-red-400" />
              <div className="text-center">
                <p className="text-lg font-medium text-red-400 mb-2">Emergency Communication Channel</p>
                <p className="text-sm">This is for urgent incidents and emergencies only.</p>
                <p className="text-xs mt-2 text-gray-600">All messages are logged and monitored.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  <div className="flex items-start space-x-3 mb-2">
                    <Avatar
                      src={null}
                      name={message.sender}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white text-sm">{message.sender}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {message.text.includes('[') && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30">
                            INCIDENT
                          </span>
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="bg-black/30 rounded-lg p-3 border border-gray-600/30">
                        {editingMessageId === message.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              ref={editInputRef}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveEdit();
                                } else if (e.key === 'Escape') {
                                  cancelEdit();
                                }
                              }}
                              className="flex-1 bg-transparent border-none outline-none text-white"
                            />
                            <button
                              onClick={saveEdit}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-white text-sm leading-relaxed">
                            {message.text}
                          </div>
                        )}
                        
                        {/* Location Map */}
                        {message.location && (
                          <div className="mt-3 pt-3 border-t border-gray-600/30">
                            <SmallMap
                              lat={message.location.lat}
                              lng={message.location.lng}
                              address={message.address}
                              onMapClick={() => handleMapClick(message.location!, message.address)}
                              className="mb-2"
                              incidentType={message.text.includes('[') ? message.text.split('[')[1]?.split('-')[0]?.toLowerCase().trim() : undefined}
                            />
                            {message.address && (
                              <div className="text-xs text-gray-400 mt-2">
                                📍 {message.address}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {canEditOrDelete(message) && (
                        <div className="flex space-x-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(message)}
                            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-400/10 transition-colors"
                            title="Edit message"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Location Display */}
        {location && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-blue-400">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Location will be shared</span>
                </div>
                {address && (
                  <div className="text-sm text-gray-300 mt-1">{address}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </div>
              </div>
              <button
                onClick={() => {
                  setLocation(null);
                  setAddress('');
                }}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="flex space-x-3 items-end">
          <button
            onClick={() => setShowIncidentModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
            title="Report incident with location"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
          
          <button
            onClick={getLocation}
            disabled={isGettingLocation}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-3 rounded-lg transition-colors"
            title="Share current location"
          >
            {isGettingLocation ? (
              <LoadingSpinner size="sm" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </button>
          
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type an incident report or message..."
              className="w-full p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400 resize-none"
              rows={2}
              disabled={isSending}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white p-3 rounded-lg transition-colors"
          >
            {isSending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Big Map Modal */}
        {showBigMap && selectedMapLocation && (
          <BigMapModal
            isOpen={showBigMap}
            onClose={() => setShowBigMap(false)}
            lat={selectedMapLocation.lat}
            lng={selectedMapLocation.lng}
            address={selectedMapLocation.address}
          />
        )}

        {/* Incident Report Modal */}
        <IncidentReportModal
          isOpen={showIncidentModal}
          onClose={() => setShowIncidentModal(false)}
          onSubmit={handleIncidentSubmit}
        />
      </div>
    </Layout>
  );
}
