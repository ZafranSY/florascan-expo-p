import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Locale = 'en' | 'bm';

interface SettingsState {
  locale: Locale;
  modelVersion: string;
  offlineMode: boolean;
  notificationsEnabled: boolean;
  setLocale: (locale: Locale) => void;
  setModelVersion: (version: string) => void;
  toggleOfflineMode: () => void;
  toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'en',
      modelVersion: 'efficientnet_b0',
      offlineMode: false,
      notificationsEnabled: true,
      setLocale: (locale) => set({ locale }),
      setModelVersion: (modelVersion) => set({ modelVersion }),
      toggleOfflineMode: () => set((state) => ({ offlineMode: !state.offlineMode })),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
    }),
    {
      name: 'florascan-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
