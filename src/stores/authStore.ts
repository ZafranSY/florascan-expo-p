import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../models/User';

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: User, token: string, role: UserRole) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isInitialized: false,
      setUser: (user, token, role) =>
        set({
          user,
          token,
          role,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
        }),
      setHydrated: () => set({ isInitialized: true }),
    }),
    {
      name: 'florascan-auth',
      storage: createJSONStorage(() => 
        (typeof window !== 'undefined' 
          ? AsyncStorage 
          : {
              getItem: (name: string) => Promise.resolve(null),
              setItem: (name: string, value: string) => Promise.resolve(),
              removeItem: (name: string) => Promise.resolve(),
            }) as any
      ),
      onRehydrateStorage: (state) => {
        console.log('AuthStore: Rehydration starting...');
        return (finalState: AuthState | undefined, error: unknown) => {
          if (error) {
            console.error('AuthStore: Rehydration error:', error);
          }
          console.log('AuthStore: Rehydration finished.');
          // Ensure flag is set regardless of state content
          useAuthStore.getState().setHydrated();
        };
      },
    }
  )
);

// Helper to check hydration outside of hooks if needed
export const isAuthStoreHydrated = () => useAuthStore.getState().isInitialized;
