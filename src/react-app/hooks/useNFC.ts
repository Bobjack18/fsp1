import { useState } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export interface NFCResult {
  success: boolean;
  message: string;
  data?: any;
}

export function useNFC() {
  const [nfcStatus, setNfcStatus] = useState('');
  const [isNFCOperating, setIsNFCOperating] = useState(false);
  const { user } = useAuth();

  const checkNFCSupport = (): boolean => {
    return 'NDEFReader' in window;
  };

  const enrollNFC = async (): Promise<NFCResult> => {
    if (!checkNFCSupport()) {
      const message = 'NFC not supported in this browser. Please use Chrome on Android or Safari on iOS.';
      setNfcStatus(message);
      return { success: false, message };
    }

    if (!user) {
      const message = 'Please log in first to enroll NFC tag';
      setNfcStatus(message);
      return { success: false, message };
    }

    try {
      setIsNFCOperating(true);
      setNfcStatus('Permission required - please allow NFC access...');
      
      const ndef = new (window as any).NDEFReader();
      
      // Request permissions explicitly
      await ndef.scan();
      
      setNfcStatus('Hold a blank NFC tag near your device...');

      // Create enrollment data with Mocha user data
      const enrollmentData = {
        userId: user.uid,
        email: user.email,
        enrolledAt: new Date().toISOString(),
        appUrl: 'https://thvzkwm5ewc3m.mocha.app',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: Date.now()
        }
      };

      const textEncoder = new TextEncoder();
      const jsonData = JSON.stringify(enrollmentData);

      await ndef.write({
        records: [
          {
            recordType: 'text',
            data: textEncoder.encode(jsonData)
          },
          {
            recordType: 'url',
            data: 'https://thvzkwm5ewc3m.mocha.app/nfc-login'
          }
        ]
      });

      // Save NFC UID to user profile
      try {
        const response = await fetch('/api/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nfc_tag_uid: `nfc_${user.uid}_${Date.now()}`
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save NFC data to profile');
        }
      } catch (dbError) {
        console.warn('Failed to save NFC data to database:', dbError);
      }

      const successMessage = 'NFC tag enrolled successfully! You can now use this tag for quick login.';
      setNfcStatus(successMessage);
      
      setTimeout(() => setNfcStatus(''), 5000);
      return { success: true, message: successMessage, data: enrollmentData };

    } catch (error: any) {
      let errorMessage = 'NFC enrollment failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'NFC permission denied. Please allow NFC access and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'NFC not supported on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'NFC tag is not writable or already contains data.';
      } else if (error.message) {
        errorMessage = `NFC Error: ${error.message}`;
      }

      setNfcStatus(errorMessage);
      setTimeout(() => setNfcStatus(''), 8000);
      return { success: false, message: errorMessage };
    } finally {
      setIsNFCOperating(false);
    }
  };

  const readNFC = async (): Promise<NFCResult> => {
    if (!checkNFCSupport()) {
      const message = 'NFC not supported in this browser';
      setNfcStatus(message);
      return { success: false, message };
    }

    try {
      setIsNFCOperating(true);
      setNfcStatus('Hold your NFC tag near the device...');
      
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          setNfcStatus('NFC read timeout - please try again');
          setIsNFCOperating(false);
          resolve({ success: false, message: 'Timeout waiting for NFC tag' });
        }, 15000);

        ndef.addEventListener('reading', ({ message }: any) => {
          clearTimeout(timeout);
          try {
            let nfcData = null;
            
            for (const record of message.records) {
              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                const data = textDecoder.decode(record.data);
                
                try {
                  nfcData = JSON.parse(data);
                } catch {
                  nfcData = { rawText: data };
                }
                break;
              }
            }

            const successMessage = `NFC tag read successfully! User: ${nfcData?.email || 'Unknown'}`;
            setNfcStatus(successMessage);
            setIsNFCOperating(false);
            
            setTimeout(() => setNfcStatus(''), 5000);
            resolve({ success: true, message: successMessage, data: nfcData });

          } catch (error) {
            const errorMessage = `Error processing NFC data: ${error}`;
            setNfcStatus(errorMessage);
            setIsNFCOperating(false);
            setTimeout(() => setNfcStatus(''), 5000);
            resolve({ success: false, message: errorMessage });
          }
        });

        ndef.addEventListener('readingerror', () => {
          clearTimeout(timeout);
          const errorMessage = 'Error reading NFC tag. Please try again.';
          setNfcStatus(errorMessage);
          setIsNFCOperating(false);
          setTimeout(() => setNfcStatus(''), 5000);
          resolve({ success: false, message: errorMessage });
        });
      });

    } catch (error: any) {
      let errorMessage = 'NFC read failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'NFC permission denied. Please allow NFC access.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'NFC not supported on this device.';
      } else if (error.message) {
        errorMessage = `NFC Error: ${error.message}`;
      }

      setNfcStatus(errorMessage);
      setIsNFCOperating(false);
      setTimeout(() => setNfcStatus(''), 8000);
      return { success: false, message: errorMessage };
    }
  };

  const clearNFC = async (): Promise<NFCResult> => {
    if (!checkNFCSupport()) {
      return { success: false, message: 'NFC not supported' };
    }

    try {
      setIsNFCOperating(true);
      setNfcStatus('Hold the NFC tag to clear...');
      
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [] });
      
      const message = 'NFC tag cleared successfully!';
      setNfcStatus(message);
      setTimeout(() => setNfcStatus(''), 3000);
      return { success: true, message };
    } catch (error: any) {
      const errorMessage = `Failed to clear NFC tag: ${error.message || error}`;
      setNfcStatus(errorMessage);
      setTimeout(() => setNfcStatus(''), 5000);
      return { success: false, message: errorMessage };
    } finally {
      setIsNFCOperating(false);
    }
  };

  const loginWithNFC = async (nfcData: any): Promise<NFCResult> => {
    if (!nfcData || !nfcData.userId) {
      return { success: false, message: 'Invalid NFC data' };
    }

    try {
      setIsNFCOperating(true);
      setNfcStatus('Authenticating with NFC...');

      const response = await fetch('/api/auth/nfc-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nfcData),
      });

      if (!response.ok) {
        throw new Error('NFC authentication failed');
      }

      const result = await response.json();
      setNfcStatus('NFC login successful!');
      setTimeout(() => setNfcStatus(''), 3000);
      
      return { success: true, message: 'NFC login successful', data: result };
    } catch (error: any) {
      const errorMessage = `NFC login failed: ${error.message || 'Unknown error'}`;
      setNfcStatus(errorMessage);
      setTimeout(() => setNfcStatus(''), 5000);
      return { success: false, message: errorMessage };
    } finally {
      setIsNFCOperating(false);
    }
  };

  return {
    enrollNFC,
    readNFC,
    clearNFC,
    loginWithNFC,
    nfcStatus,
    isNFCOperating,
    setNfcStatus,
    checkNFCSupport,
  };
}
