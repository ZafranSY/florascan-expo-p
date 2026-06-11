import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { User, UserRole } from '../models/User';

export function useAuthSync() {
  const { setUser, clearAuth, setHydrated, isInitialized, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthSync: Firebase User changed ->', firebaseUser?.email);
      
      if (firebaseUser) {
        try {
          // If we have a firebase user, but the store doesn't have a user object, fetch it
          const token = await firebaseUser.getIdToken();
          
          // Only fetch if we don't have a user in store or if we want to ensure fresh data
          const profile = await apiService.getMyProfile();
          
          const mappedUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || profile.name || '',
            role: profile.role,
            locale: profile.locale || 'en'
          };
 
          setUser(mappedUser, token, profile.role as UserRole);
          console.log('AuthSync: Store updated for', mappedUser.email);
        } catch (error) {
          console.error('AuthSync: Error fetching profile ->', error);
          
          // Fallback: If API fails, create a minimal local user object so the UI isn't stuck
          // We need a token here too, let's fetch it again to be safe in catch block if needed
          const token = await firebaseUser.getIdToken().catch(() => '');
          
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Farmer',
            role: 'farmer', // Default role
            locale: 'en'
          };
          
          setUser(fallbackUser, token, 'farmer');
          console.log('AuthSync: Applied fallback user due to API failure');
        }
      } else {
        // No firebase user
        if (isAuthenticated) {
          console.log('AuthSync: No firebase user, clearing store');
          clearAuth();
        }
      }
      
      // Ensure the app is marked as initialized regardless
      if (!isInitialized) {
        setHydrated();
      }
    });

    return () => unsubscribe();
  }, [setUser, clearAuth, setHydrated, isInitialized, isAuthenticated]);
}
