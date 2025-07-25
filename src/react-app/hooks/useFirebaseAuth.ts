import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, setPersistence, browserLocalPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { ref, push, serverTimestamp } from 'firebase/database';
import { auth, database } from '@/firebase/config';

export interface FirebaseUser extends User {
  isAdmin?: boolean;
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ADMIN_EMAIL = 'flatbushpatrol101@gmail.com';

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userWithAdmin: FirebaseUser = {
          ...firebaseUser,
          isAdmin: firebaseUser.email?.toLowerCase() === ADMIN_EMAIL
        };
        setUser(userWithAdmin);

        // Log login event
        push(ref(database, 'logins'), {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          timestamp: Date.now()
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }
      
      return result;
    } catch (err: any) {
      setError('Invalid email or password!');
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        
        // Log signup event
        push(ref(database, 'signups'), {
          uid: result.user.uid,
          name: name,
          email: email,
          timestamp: serverTimestamp()
        });
      }
      
      return result;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please log in.');
      } else {
        setError(`Signup failed: ${err.message}`);
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err: any) {
      setError(`Error sending reset email: ${err.message}`);
      throw err;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await updateProfile(user, updates);
      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err: any) {
      setError(`Error updating profile: ${err.message}`);
      throw err;
    }
  };

  return {
    user,
    isLoading,
    error,
    login,
    signup,
    logout,
    resetPassword,
    updateUserProfile,
    setError
  };
}
