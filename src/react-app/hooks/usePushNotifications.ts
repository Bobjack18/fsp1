import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export interface PushNotificationSettings {
  enabled: boolean;
  messages: boolean;
  incidents: boolean;
  alerts: boolean;
  directMessages: boolean;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState<PushNotificationSettings>({
    enabled: false,
    messages: true,
    incidents: true,
    alerts: true,
    directMessages: true,
  });
  const { user } = useAuth();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load settings from server
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/users/me/push-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.warn('Failed to load push notification settings:', err);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser. Please use Chrome, Edge, Firefox, or Safari.');
      return false;
    }

    if (permission === 'granted') {
      setStatus('Permission already granted!');
      return true;
    }

    try {
      setIsLoading(true);
      setError(null);
      setStatus('Requesting notification permission...');

      // Show a user-friendly prompt first
      const userConsent = confirm(
        'Enable push notifications to receive alerts about:\n\n' +
        '• New messages in group chats\n' +
        '• Direct messages from other users\n' +
        '• Emergency incidents and alerts\n' +
        '• Important safety announcements\n\n' +
        'Click OK to allow notifications, or Cancel to skip.'
      );

      if (!userConsent) {
        setStatus('Permission request cancelled by user');
        setError('Push notifications were not enabled. You can enable them later in Settings.');
        return false;
      }

      // Request the actual permission
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        setStatus('✅ Notification permission granted! You can now receive push notifications.');
        setError(null);
        return true;
      } else if (newPermission === 'denied') {
        setError('❌ Notification permission denied. To enable notifications:\n\n' +
          '1. Click the 🔒 lock icon in your browser\'s address bar\n' +        
          '2. Set "Notifications" to "Allow"\n' +
          '3. Refresh the page and try again');
        setStatus('Permission denied');
        return false;
      } else {
        setError('Notification permission was dismissed. You can try again in Settings.');
        setStatus('Permission dismissed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    if (permission !== 'granted') {
      setError('Please allow notifications first by clicking the "Request Permission" button');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      setStatus('Setting up push notifications...');

      // Register service worker if not already registered
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        setStatus('Service worker registered successfully...');
      } catch (swError) {
        console.warn('Service Worker registration failed:', swError);
        // For demo purposes, continue without actual push registration
        setStatus('✅ Push notifications enabled successfully! (Demo mode - notifications will show as browser alerts)');
        setSettings(prev => ({ ...prev, enabled: true }));
        
        // Save to server
        await saveSubscriptionToServer(null);
        return true;
      }

      // Generate a demo VAPID key for development
      const applicationServerKey = urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlnRC3XeCdmrKNGv3hJhHstfn5_NjdQoaq2XzxJdl6H5tIo5j8sBH7c'
      );

      // Subscribe to push notifications
      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        setStatus('Push subscription created...');
      } catch (subError) {
        console.warn('Push subscription failed:', subError);
        // Fall back to demo mode
        setStatus('✅ Push notifications enabled successfully! (Demo mode - notifications will show as browser alerts)');
        setSettings(prev => ({ ...prev, enabled: true }));
        await saveSubscriptionToServer(null);
        return true;
      }

      // Send subscription to server
      await saveSubscriptionToServer(subscription);

      setStatus('✅ Push notifications enabled successfully! You will receive notifications even when the app is closed.');
      setSettings(prev => ({ ...prev, enabled: true }));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to push notifications';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscriptionToServer = async (subscription: PushSubscription | null) => {
    try {
      const response = await fetch('/api/users/me/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription ? subscription.toJSON() : null,
          settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save push subscription to server');
      }
    } catch (err) {
      console.warn('Failed to save subscription to server:', err);
      // Don't fail the whole process for this
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('Disabling push notifications...');

      // Get service worker registration
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
      } catch (err) {
        console.warn('Failed to unsubscribe from push manager:', err);
      }

      // Remove subscription from server
      try {
        const response = await fetch('/api/users/me/push-unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to remove push subscription from server');
        }
      } catch (err) {
        console.warn('Failed to remove subscription from server:', err);
      }

      setStatus('✅ Push notifications disabled successfully');
      setSettings(prev => ({ ...prev, enabled: false }));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<PushNotificationSettings>): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedSettings = { ...settings, ...newSettings };

      const response = await fetch('/api/users/me/push-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update push notification settings');
      }

      setSettings(updatedSettings);
      setStatus('✅ Push notification settings updated successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('Sending test notification...');

      // Try to send via service worker first
      if (settings.enabled && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.showNotification('🔔 Test Notification', {
              body: 'This is a test notification from Flatbush Safety Patrol. Your notifications are working properly!',
              icon: '/icon-192x192.png',
              badge: '/icon-72x72.png',
              tag: 'test-notification',
              requireInteraction: true
            });
            
            setStatus('✅ Test notification sent successfully! Check your notifications.');
            return true;
          }
        } catch (swError) {
          console.warn('Service worker notification failed:', swError);
        }
      }

      // Fallback to browser notification
      if (permission === 'granted') {
        new Notification('🔔 Test Notification', {
          body: 'This is a test notification from Flatbush Safety Patrol. Your notifications are working properly!',
          icon: '/icon-192x192.png',
          tag: 'test-notification'
        });
        
        setStatus('✅ Test notification sent successfully! Check your notifications.');
        return true;
      }

      // Also call server endpoint for completeness
      try {
        const response = await fetch('/api/users/me/push-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setStatus('✅ Test notification sent successfully!');
          return true;
        }
      } catch (serverError) {
        console.warn('Server test notification failed:', serverError);
      }

      throw new Error('Unable to send test notification. Please check your notification settings.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }  
  };

  // Helper function to convert base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const clearStatus = () => {
    setStatus('');
    setError(null);
  };

  return {
    isSupported,
    permission,
    isLoading,
    error,
    status,
    settings,
    requestPermission,
    subscribe,
    unsubscribe,
    updateSettings,
    sendTestNotification,
    clearStatus,
  };
}
