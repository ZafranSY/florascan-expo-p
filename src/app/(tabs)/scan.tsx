import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettingsStore } from '../../stores/settingsStore';
import usePermissions from '../../hooks/usePermissions';
import { useScanViewModel } from '../../viewmodels/useScanViewModel';
import { useScanStore } from '../../stores/scanStore';

// ── Grounded AgTech Design Tokens ──
const AG = {
  bgMain:       '#F8F9FA',
  bgCard:       '#FFFFFF',
  textPrimary:  '#1C2B24',
  textSecondary:'#5A6B63',
  accentGreen:  '#2D5A43',
  healthyFill:  '#EAF5EE',
  muted:        '#8A9B91',
};

const TRANSLATIONS = {
  en: {
    init: 'Initializing camera...',
    permTitle: 'Camera Access Required',
    permBody: 'FloraScan needs camera access to scan and diagnose your crops in real time. You can also upload from your gallery.',
    enableSettings: 'Enable in Settings',
    uploadGallery: 'Upload from Gallery',
    hudTitle: 'FloraScan AI',
    analyzingTissue: 'Analyzing plant tissue...',
    alignHint: 'Align leaf within frame',
    analyzingPlant: 'Analyzing Plant...',
  },
  bm: {
    init: 'Memulakan kamera...',
    permTitle: 'Akses Kamera Diperlukan',
    permBody: 'FloraScan memerlukan akses kamera untuk mengimbas dan mendiagnosis tanaman anda dalam masa nyata. Anda juga boleh memuat naik dari galeri.',
    enableSettings: 'Buka Tetapan',
    uploadGallery: 'Muat Naik dari Galeri',
    hudTitle: 'AI FloraScan',
    analyzingTissue: 'Menganalisis tisu tumbuhan...',
    alignHint: 'Selaraskan daun dalam bingkai',
    analyzingPlant: 'Menganalisis Tumbuhan...',
  },
};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.72;

export default function ScanScreen() {
  const { refreshPermissions, hasCameraPermission, requestGalleryPermission } = usePermissions();
  const { runScan } = useScanViewModel();
  const { isLoading, currentScan, error, setError } = useScanStore();
  const { locale } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const cameraRef = useRef<CameraView>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const [flashOn, setFlashOn] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshPermissions();
    }, [refreshPermissions])
  );

  useEffect(() => {
    if (!isLoading && currentScan) {
      router.push('/result');
    }
  }, [isLoading, currentScan, router]);

  // Display scan/connection errors in a native popup dialog
  useEffect(() => {
    if (error) {
      Alert.alert(
        locale === 'bm' ? 'Penyambungan Gagal' : 'Scan / Connection Failed',
        error,
        [{ text: 'OK', onPress: () => setError(null) }]
      );
    }
  }, [error, setError, locale]);

  // Scanning animation
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (isLoading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: FRAME_SIZE, duration: 1800, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      );
      animation.start();
    } else {
      scanLineAnim.setValue(0);
    }
    return () => { if (animation) animation.stop(); };
  }, [isLoading, scanLineAnim]);

  const handleCapture = async () => {
    if (cameraRef.current && !isLoading) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo?.uri) await runScan(photo.uri);
      } catch (error) {
        console.error('Capture failed', error);
      }
    }
  };

  const handleGalleryPicker = async () => {
    if (isLoading) return;
    const granted = await requestGalleryPermission();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      await runScan(result.assets[0].uri);
    }
  };

  // ── Permission / Fallback State ──
  if (hasCameraPermission === null) {
    return (
      <View style={styles.permScreen}>
        <Text style={styles.initText}>{t.init}</Text>
      </View>
    );
  }

  if (!hasCameraPermission) {
    return (
      <View style={styles.permScreen}>
        {/* Top spacer */}
        <View style={{ flex: 1 }} />

        {/* Icon badge */}
        <View style={styles.permIconCircle}>
          <Ionicons name="camera" size={40} color={AG.accentGreen} />
        </View>

        <Text style={styles.permTitle}>{t.permTitle}</Text>
        <Text style={styles.permBody}>
          {t.permBody}
        </Text>

        {/* Primary: Enable in Settings */}
        <TouchableOpacity style={styles.permPrimaryBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.permPrimaryText}>{t.enableSettings}</Text>
        </TouchableOpacity>

        {/* Secondary: Upload from Gallery */}
        <TouchableOpacity style={styles.permSecondaryBtn} onPress={handleGalleryPicker}>
          <Ionicons name="images-outline" size={18} color={AG.accentGreen} />
          <Text style={styles.permSecondaryText}>{t.uploadGallery}</Text>
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View style={{ flex: 1.2 }} />
      </View>
    );
  }

  // ── Active Camera Viewfinder with AI HUD ──
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        facing="back"
        enableTorch={flashOn}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Top Utility Bar (glassmorphic) ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarInner}>
          {/* Flash toggle */}
          <TouchableOpacity style={styles.hudBtn} onPress={() => setFlashOn(!flashOn)}>
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={20} color="#FFF" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.hudTitle}>{t.hudTitle}</Text>

          {/* Gallery shortcut */}
          <TouchableOpacity style={styles.hudBtn} onPress={handleGalleryPicker} disabled={isLoading}>
            <Ionicons name="images-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Target Frame Overlay ── */}
      <View style={styles.frameOverlay}>
        {/* Semi-transparent mask around the frame */}
        <View style={styles.frameMaskTop} />
        <View style={styles.frameMaskRow}>
          <View style={styles.frameMaskSide} />
          <View style={styles.frameBox}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scanning line animation */}
            {isLoading && (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]}
              />
            )}
          </View>
          <View style={styles.frameMaskSide} />
        </View>
        <View style={styles.frameMaskBottom} />
      </View>

      {/* ── Alignment Hint ── */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          {isLoading ? t.analyzingTissue : t.alignHint}
        </Text>
      </View>

      {/* ── Bottom Capture Bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {/* Spacer left */}
        <View style={{ width: 56 }} />

        {/* Shutter button */}
        <TouchableOpacity
          style={[styles.shutterOuter, isLoading && { opacity: 0.5 }]}
          onPress={handleCapture}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* Spacer right */}
        <View style={{ width: 56 }} />
      </View>

      {/* ── Loading Overlay ── */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>{t.analyzingPlant}</Text>
        </View>
      )}
    </View>
  );
}

const MASK_COLOR = 'rgba(0,0,0,0.45)';

const styles = StyleSheet.create({
  // ── Permission Screen ──
  permScreen: {
    flex: 1,
    backgroundColor: AG.bgMain,
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  initText: {
    fontSize: 16,
    color: AG.textSecondary,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.45,
  },
  permIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AG.healthyFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  permTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AG.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permBody: {
    fontSize: 15,
    lineHeight: 23,
    color: AG.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  permPrimaryBtn: {
    width: '100%',
    backgroundColor: AG.accentGreen,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  permPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  permSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  permSecondaryText: {
    color: AG.accentGreen,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Camera Viewfinder ──
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Top Utility Bar ──
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Target Frame ──
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  frameMaskTop: {
    flex: 1,
    backgroundColor: MASK_COLOR,
  },
  frameMaskRow: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  frameMaskSide: {
    flex: 1,
    backgroundColor: MASK_COLOR,
  },
  frameBox: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    // transparent center
  },
  frameMaskBottom: {
    flex: 1,
    backgroundColor: MASK_COLOR,
  },

  // Corner markers
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },

  // Scan line
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: AG.accentGreen,
    shadowColor: AG.accentGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Alignment Hint ──
  hintContainer: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    zIndex: 15,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    letterSpacing: 0.3,
  },

  // ── Bottom Capture Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },

  // ── Loading Overlay ──
  loadingOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 25,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
});
