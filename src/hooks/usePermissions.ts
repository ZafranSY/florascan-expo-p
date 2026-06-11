import { useEffect } from 'react';
import { Alert, Linking, AppState, AppStateStatus } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function usePermissions() {
  const [cameraStatus, requestCamera] = useCameraPermissions();
  const [galleryStatus, requestGallery] = ImagePicker.useMediaLibraryPermissions();

  // Silent refresh is deprecated in SDK 54, relying on state
  const refreshPermissions = async () => {
    // Relying on useCameraPermissions state
  };

  // Trigger a refresh of permissions when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // useCameraPermissions updates automatically
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const requestCameraPermission = async (showPrompt = true): Promise<boolean> => {
    if (!cameraStatus) return false;
    if (cameraStatus.granted) return true;

    if (cameraStatus.canAskAgain) {
      const response = await requestCamera();
      return response.granted;
    } else if (showPrompt && cameraStatus.status !== 'undetermined') {
      Alert.alert(
        'Camera Access Required',
        'FloraScan needs camera access to diagnose plants. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
    return false;
  };

  const requestGalleryPermission = async (showPrompt = true): Promise<boolean> => {
    if (!galleryStatus) return false;
    if (galleryStatus.granted) return true;

    if (galleryStatus.canAskAgain) {
      const response = await requestGallery();
      return response.granted;
    } else if (showPrompt && galleryStatus.status !== 'undetermined') {
      Alert.alert(
        'Media Library Access Required',
        'FloraScan needs gallery access to upload plant photos. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
    return false;
  };

  return { 
    requestCameraPermission, 
    requestGalleryPermission,
    refreshPermissions,
    hasCameraPermission: cameraStatus?.granted ?? null,
    hasGalleryPermission: galleryStatus?.granted ?? null,
  };
}
