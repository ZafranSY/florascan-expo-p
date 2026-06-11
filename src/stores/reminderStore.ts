import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Reminder {
  id: string;
  diseaseName: string;
  days: number;
  scheduledAt: string;
  targetDate: string;
}

interface ReminderState {
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
  clearAll: () => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      reminders: [],
      addReminder: (reminder) => 
        set((state) => ({ 
          // We only keep one reminder per disease for simplicity, or just append
          reminders: [...state.reminders.filter(r => r.diseaseName !== reminder.diseaseName), reminder] 
        })),
      removeReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        })),
      clearAll: () => set({ reminders: [] }),
    }),
    {
      name: 'florascan-reminders',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
