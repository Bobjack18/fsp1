import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getRemoteConfig } from 'firebase/remote-config';

const firebaseConfig = {
  apiKey: "AIzaSyAiOxlFuVTJdhZaq7Zaysk_J5y7qWOrjfg",
  authDomain: "flatbushsp.firebaseapp.com",
  projectId: "flatbushsp",
  storageBucket: "flatbushsp.appspot.com",
  messagingSenderId: "476872795900",
  appId: "1:476872795900:web:50cdbed8d0273407639979",
  measurementId: "G-8XPZF1BFLB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const remoteConfig = getRemoteConfig(app);

// Configure Remote Config
remoteConfig.settings.minimumFetchIntervalMillis = 0;
remoteConfig.defaultConfig = {
  chat_password: "default_password"
};

export default app;
