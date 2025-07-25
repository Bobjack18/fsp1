import { useState } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export interface TwoFASetupData {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export function use2FA() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const { user } = useAuth();

  const generateSecret = async (): Promise<TwoFASetupData | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call backend to generate secret and QR code
      const response = await fetch('/api/users/me/2fa/generate-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate 2FA secret');
      }

      const setupData = await response.json();
      setStatus('2FA secret generated successfully');
      return setupData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate 2FA secret';
      setError(errorMessage);
      setStatus(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable2FA = async (secret: string, token: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Save to backend
      const response = await fetch('/api/users/me/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret,
          token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enable 2FA on server');
      }

      setStatus('2FA enabled successfully!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable 2FA';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async (token: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users/me/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }

      setStatus('2FA disabled successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async (token: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users/me/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid 2FA code');
      }

      setStatus('2FA verification successful');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid 2FA code';
      setError(errorMessage);
      setStatus(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateBackupCodes = async (): Promise<string[] | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/users/me/2fa/backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate backup codes');
      }

      const data = await response.json();
      setStatus('Backup codes generated successfully');
      return data.codes;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate backup codes';
      setError(errorMessage);
      setStatus(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearStatus = () => {
    setStatus('');
    setError(null);
  };

  return {
    isLoading,
    error,
    status,
    generateSecret,
    verifyAndEnable2FA,
    disable2FA,
    verify2FA,
    generateBackupCodes,
    clearStatus,
  };
}
