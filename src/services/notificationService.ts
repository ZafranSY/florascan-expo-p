import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * ROOT CAUSE ANALYSIS:
 * starting from SDK 53, expo-notifications crashes Expo Go on Android during initialization
 * because remote notification functionality was removed.
 * 
 * FIX: We check if we are running in Expo Go (ExecutionEnvironment.StoreClient).
 * If so, we bypass the native notification setup to prevent the fatal crash,
 * allowing UI development to continue.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

if (!isExpoGo) {
  try {
    // We use require instead of static import to prevent the crash at the top-level
    Notifications = require('expo-notifications');
    
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Create high-importance Android channel so banners slide down over the UI
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'FloraScan Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        lightColor: '#2D5A43',
      });
    }
  } catch (e) {
    console.error('Failed to initialize Notifications:', e);
  }
}

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (isExpoGo) {
    console.warn('[Notifications] Setup skipped: Expo Go SDK 53+ does not support native notifications on Android. Use a Development Build for this feature.');
    return false;
  }

  if (!Notifications) return false;

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return false;
  }

  return true;
};

export const scheduleTreatmentReminders = async (diseaseName: string, dosageSchedule: any[], locale: string = 'en', days: number = 1) => {
  if (isExpoGo || !Notifications) {
    console.log('[Notifications] Scheduling skipped in Expo Go. Running in Simulation Mode.');
    return { success: true, id: 'sim-' + Date.now(), isSimulation: true };
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return { success: false, reason: 'no_permission' };

    await Notifications.cancelAllScheduledNotificationsAsync();

    const isBM = locale === 'bm';
    const title = isBM ? 'Peringatan Rawatan FloraScan' : 'FloraScan Treatment Reminder';
    const body = isBM 
      ? `Masa untuk meletakkan rawatan ${diseaseName} hari ini!`
      : `It is time to apply your treatment for ${diseaseName} today!`;

    // Schedule for 'days' from now
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: 'default',
      },
      trigger: {
        seconds: days * 24 * 60 * 60, 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });

    console.log(`Successfully scheduled reminder [${notificationId}] for ${diseaseName} in ${days} day(s).`);
    return { success: true, id: notificationId };
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return { success: false, reason: 'error' };
  }
};

export const cancelNotification = async (id: string) => {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
};

/**
 * 5-second demo trigger for viva/presentation testing.
 * Fires a local notification 5 seconds after being called.
 */
export const scheduleTestNotification = async (locale: string = 'en'): Promise<boolean> => {
  if (isExpoGo || !Notifications) {
    console.log('[Notifications] Test notification skipped in Expo Go.');
    return false;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    const isBM = locale === 'bm';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isBM ? '🔔 Masa Rawatan Pokok Betik!' : '🔔 Papaya Care Treatment Time!',
        body: isBM
          ? 'Sila lakukan langkah rawatan seterusnya untuk mengekang penyakit.'
          : 'Please execute the next treatment step to control the pathogen.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: 'default',
      },
      trigger: {
        seconds: 5,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to schedule test notification:', error);
    return false;
  }
};
