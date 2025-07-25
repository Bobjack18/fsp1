import { useState } from 'react';
import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { remoteConfig } from '@/firebase/config';

export function useChatPassword() {
  const [isChecking, setIsChecking] = useState(false);

  const checkChatPassword = async (chatType: 'messages' | 'messages_v2'): Promise<boolean> => {
    const ONE_WEEK_MILLIS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const localStorageKey = `chat_password_remember_${chatType}`;
    
    const lastAccessedTime = localStorage.getItem(localStorageKey);
    const currentTime = Date.now();

    // Check if the password was remembered recently
    if (lastAccessedTime) {
      if (currentTime - parseInt(lastAccessedTime, 10) < ONE_WEEK_MILLIS) {
        console.log("Password remembered! Access granted for " + chatType);
        // Update the timestamp to reset the "week" countdown
        localStorage.setItem(localStorageKey, currentTime.toString());
        return true;
      } else {
        // If more than a week has passed, clear the old timestamp
        console.log("Remembered password expired for " + chatType);
        localStorage.removeItem(localStorageKey);
      }
    }

    // If not remembered or expired, proceed with fetching from Remote Config and prompting
    try {
      setIsChecking(true);
      console.log("Fetching Remote Config for chat password...");
      await fetchAndActivate(remoteConfig);
      const storedPassword = getValue(remoteConfig, 'chat_password').asString();
      console.log("Remote Config fetched. Prompting for password...");

      const enteredPassword = prompt("Please enter the chat password:");

      if (enteredPassword === storedPassword) {
        console.log("Password correct! Access granted.");
        
        // Store the current time in local storage to remember for a week
        localStorage.setItem(localStorageKey, currentTime.toString());
        return true;
      } else {
        alert("Incorrect chat password. Access denied.");
        return false;
      }
    } catch (error) {
      console.error("Error fetching Remote Config or checking password:", error);
      alert("Could not check chat password. Please try again later or contact support.");
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkChatPassword,
    isChecking
  };
}
