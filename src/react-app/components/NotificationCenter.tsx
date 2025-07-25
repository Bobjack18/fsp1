import { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNotifications, type Notification } from '@/react-app/hooks/useNotifications';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationColors = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-900/20';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-900/20';
      case 'error':
        return 'border-red-500/30 bg-red-900/20';
      default:
        return 'border-blue-500/30 bg-blue-900/20';
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: number) => {
    setDeletingIds(prev => new Set([...prev, notificationId]));
    const success = await deleteNotification(notificationId);
    if (!success) {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-lg border border-accent/40 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-glow-strong">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-accent/30">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-accent" />
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{unreadCount}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-accent">Notifications</h3>
              <p className="text-sm text-gray-400">
                {notifications.length} total, {unreadCount} unread
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-blue-400 hover:text-blue-300 transition-colors p-2"
                title="Mark all as read"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8">
              <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative border rounded-lg p-4 transition-all duration-200 ${
                    notification.is_read 
                      ? 'border-gray-600 bg-black/20' 
                      : `${getNotificationColors(notification.type)} shadow-md`
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            notification.is_read ? 'text-gray-300' : 'text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            notification.is_read ? 'text-gray-400' : 'text-gray-300'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-4">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={deletingIds.has(notification.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1 disabled:opacity-50"
                            title="Delete notification"
                          >
                            {deletingIds.has(notification.id) ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
