import { useState } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export function useNFC() {
  const [nfcStatus, setNfcStatus] = useState('');
  const { user } = useAuth();

  const enrollNFC = async () => {
    if (!('NDEFReader' in window)) {
      setNfcStatus('NFC not supported in this browser');
      return;
    }

    try {
      setNfcStatus('Hold a blank NFC tag near the device...');
      const ndef = new (window as any).NDEFReader();
      
      if (!user) {
        setNfcStatus('Please log in first to enroll NFC tag');
        return;
      }
      
      await ndef.write({
        records: [{
          recordType: 'text',
          data: user.uid
        }]
      });
      
      setNfcStatus('NFC tag enrolled successfully!');
      
    } catch (error) {
      setNfcStatus(`NFC enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => setNfcStatus(''), 5000);
    }
  };

  const loginWithNFC = async () => {
    if (!('NDEFReader' in window)) {
      setNfcStatus('NFC not supported in this browser');
      return;
    }

    try {
      setNfcStatus('Hold your NFC tag near the device...');
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener('reading', ({ message }: any) => {
        try {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding);
              const uid = textDecoder.decode(record.data);
              setNfcStatus(`Read UID: ${uid}`);
              
              // Here you would implement the actual login logic
              // For now, just show the UID
              console.log('NFC UID:', uid);
            }
          }
        } catch (error) {
          setNfcStatus(`Error processing NFC message: ${error}`);
          console.error('NFC reading error', error);
        }
      });
    } catch (error) {
      setNfcStatus(`Error: ${error}`);
      console.error('NFC scan error', error);
    }
  };

  return {
    enrollNFC,
    loginWithNFC,
    nfcStatus,
    setNfcStatus
  };
}
