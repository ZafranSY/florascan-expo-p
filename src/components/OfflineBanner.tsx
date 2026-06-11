import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/utils/theme';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { locale } = useSettingsStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });

    return unsub;
  }, []);

  if (!isOffline) {
    return null;
  }

  const message = locale === 'bm' ? '⚠️ Mod Luar Talian - Imbasan disimpan secara lokal' : '⚠️ Offline Mode - Scans saved locally';

  return (
    <Animated.View 
      entering={FadeInUp.duration(400)}
      exiting={FadeOutUp.duration(300)}
      style={[styles.banner, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F59E0B', // Vibrant Amber
    paddingBottom: 12,
    paddingHorizontal: SPACING.md,
    zIndex: 9999,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
