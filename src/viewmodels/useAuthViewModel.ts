import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { User, UserRole } from '../models/User';

function formatAuthError(error: any): string {
  if (error && error.code) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      case 'auth/weak-password':
        return 'The password is too weak.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return `Authentication error: ${error.message}`;
    }
  }
  return 'An unexpected error occurred.';
}

export function useAuthViewModel() {
  const { setUser, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Wait for token to be available for axios interceptor
      const token = await cred.user.getIdToken();
      
      let profile: any = {};
      try {
        profile = await apiService.syncUserWithBackend();
      } catch (syncErr) {
        console.error("Backend sync error:", syncErr);
      }
      
      const mappedUser: User = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: cred.user.displayName || profile.name || '',
        role: profile.role || 'farmer',
        locale: profile.locale || 'en'
      };

      setUser(mappedUser, token, (profile.role as UserRole) || 'farmer');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile with the given name
      await updateProfile(cred.user, { displayName: name });
      
      const token = await cred.user.getIdToken();

      try {
        await apiService.syncUserWithBackend();
      } catch (syncErr) {
        console.error("Backend sync error:", syncErr);
      }

      const mappedUser: User = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: name,
        role: 'farmer',
        locale: 'en'
      };

      setUser(mappedUser, token, 'farmer');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const token = await cred.user.getIdToken();
      
      let profile: any = {};
      try {
        profile = await apiService.syncUserWithBackend();
      } catch (syncErr) {
        console.error("Backend sync error:", syncErr);
      }
      
      const mappedUser: User = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: cred.user.displayName || profile.name || '',
        role: profile.role || 'farmer',
        locale: profile.locale || 'en'
      };

      setUser(mappedUser, token, (profile.role as UserRole) || 'farmer');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut(auth);
      clearAuth();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const profile = await apiService.syncUserWithBackend();
      
      const mappedUser: User = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        name: auth.currentUser.displayName || profile.name || '',
        role: profile.role || 'farmer',
        locale: profile.locale || 'en'
      };

      setUser(mappedUser, token, (profile.role as UserRole) || 'farmer');
      return true;
    } catch (err: any) {
      setError("Failed to sync with server. Please check your connection.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    refreshProfile,
    isLoading,
    error
  };
}
