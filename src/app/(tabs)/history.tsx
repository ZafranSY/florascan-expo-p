import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryViewModel } from '@/viewmodels/useHistoryViewModel';
import { ScanResult } from '@/models/ScanResult';
import { useScanStore } from '@/stores/scanStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { resolveImageUri } from '@/utils/constants';

const AG = {
  bgMain:       '#F8F9FA',
  bgCard:       '#FFFFFF',
  textPrimary:  '#1C2B24',
  textSecondary:'#5A6B63',
  accentGreen:  '#2D5A43',
  healthy:      '#438964',
  healthyFill:  '#EAF5EE',
  disease:      '#C84B31',
  diseaseFill:  '#FDF2F0',
  warning:      '#B6862C',
  warningFill:  '#FEF9EC',
  muted:        '#8A9B91',
  border:       '#E8ECE9',
};

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.03,
  shadowRadius: 16,
  elevation: 2,
};

const TRANSLATIONS = {
  en: {
    title: 'Scan History',
    scansCount: (count: number) => `${count} scan${count !== 1 ? 's' : ''} recorded`,
    synced: 'Synced',
    pending: 'Pending',
    sync: 'Sync',
    syncing: 'Syncing...',
    loading: 'Loading history...',
    noScansTitle: 'No Scans Found',
    noScansSub: 'Start scanning your plants to track their health over time.',
    scanCta: 'Scan My First Plant',
    recentScan: 'Recent Scan',
    confidence: {
      high: 'High',
      moderate: 'Moderate',
      low: 'Low',
    },
    diseases: {
      'Anthracnose': 'Anthracnose',
      'Bacterial Spot': 'Bacterial Spot',
      'Healthy': 'Healthy',
      'Non-Papaya': 'Non-Papaya',
    },
    dateLocale: 'en-MY',
  },
  bm: {
    title: 'Rekod Imbasan',
    scansCount: (count: number) => `${count} imbasan direkodkan`,
    synced: 'Disegerak',
    pending: 'Menunggu',
    sync: 'Segerak',
    syncing: 'Menyegerak...',
    loading: 'Memuatkan rekod...',
    noScansTitle: 'Tiada Imbasan Dijumpai',
    noScansSub: 'Mula mengimbas tanaman anda untuk menjejak kesihatannya.',
    scanCta: 'Imbas Pokok Pertama Saya',
    recentScan: 'Imbasan Baru',
    confidence: {
      high: 'Tinggi',
      moderate: 'Sederhana',
      low: 'Rendah',
    },
    diseases: {
      'Anthracnose': 'Antraknosa',
      'Bacterial Spot': 'Bintik Bakteria',
      'Healthy': 'Sihat',
      'Non-Papaya': 'Bukan Betik',
    },
    dateLocale: 'ms-MY',
  },
};

const formatDate = (dateInput: string | Date | number, locale: string, t: any): string => {
  if (!dateInput) return t.recentScan;
  try {
    let d: Date;
    if (dateInput instanceof Date) d = dateInput;
    else if (typeof dateInput === 'number') d = new Date(dateInput);
    else d = Date.parse(dateInput) ? new Date(dateInput) : new Date(dateInput.replace(' ', 'T'));
    if (isNaN(d.getTime())) return t.recentScan;
    
    return d.toLocaleDateString(t.dateLocale, { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch { return t.recentScan; }
};

const getConfidenceColor = (c: number) => c >= 0.7 ? AG.healthy : c >= 0.5 ? AG.warning : AG.disease;
const getConfidenceLabel = (c: number, t: any) => c >= 0.7 ? t.confidence.high : c >= 0.5 ? t.confidence.moderate : t.confidence.low;


const SafeImage = ({ uri, style }: { uri: string | null; style: any }) => {
  const [hasError, setHasError] = useState(false);
  const resolved = resolveImageUri(uri);

  if (!resolved || hasError) {
    return (
      <View style={[style, styles.thumbPlaceholder]}>
        <Ionicons name="leaf" size={20} color={AG.muted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolved }}
      style={style}
      onError={() => setHasError(true)}
      defaultSource={require('@/assets/images/icon.png')}
    />
  );
};

export default function HistoryScreen() {
  const router = useRouter();
  const { locale } = useSettingsStore();
  const { history, isLoading, isRefreshing, refreshHistory, error, syncPendingScans } = useHistoryViewModel();
  const { setCurrentScan, setCurrentTreatment } = useScanStore();

  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  useFocusEffect(useCallback(() => { refreshHistory(); }, [refreshHistory]));

  const handleSelectScan = (scan: ScanResult) => {
    setCurrentScan(scan);
    if (scan.treatment) {
      try {
        const parsedTreatment = JSON.parse(scan.treatment);
        setCurrentTreatment(parsedTreatment);
      } catch (err) {
        console.warn('Failed to parse server-cached treatment JSON:', err);
        setCurrentTreatment(null);
      }
    } else {
      setCurrentTreatment(null);
    }
    router.push('/result');
  };

  const hasPending = history.some(s => !s.isSynced);

  const renderItem = ({ item }: { item: ScanResult }) => {
    const confColor = getConfidenceColor(item.confidence);
    return (
      <TouchableOpacity style={[styles.card, CARD_SHADOW]} onPress={() => handleSelectScan(item)} activeOpacity={0.8}>
        {/* Thumbnail */}
        <View style={styles.thumbFrame}>
          <SafeImage uri={item.imageUri} style={styles.thumb} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.diseaseName} numberOfLines={1}>
              {t.diseases[item.disease as keyof typeof t.diseases] || item.disease.replace(/_/g, ' ')}
            </Text>
            <View style={[styles.syncPill, { backgroundColor: item.isSynced ? AG.healthyFill : AG.warningFill }]}>
              <Ionicons
                name={item.isSynced ? 'cloud-done' : 'cloud-upload-outline'}
                size={11}
                color={item.isSynced ? AG.healthy : AG.warning}
              />
              <Text style={[styles.syncLabel, { color: item.isSynced ? AG.healthy : AG.warning }]}>
                {item.isSynced ? t.synced : t.pending}
              </Text>
            </View>
          </View>

          <Text style={styles.dateText}>{formatDate(item.scannedAt as any, locale, t)}</Text>

          {/* Confidence pill */}
          <View style={styles.confRow}>
            <View style={[styles.confPill, { backgroundColor: confColor + '14' }]}>
              <View style={[styles.confDot, { backgroundColor: confColor }]} />
              <Text style={[styles.confText, { color: confColor }]}>
                {(item.confidence * 100).toFixed(1)}% — {getConfidenceLabel(item.confidence, t)}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={AG.border} />
      </TouchableOpacity>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={AG.accentGreen} />
        <Text style={styles.centeredLabel}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <Text style={styles.headerSub}>{t.scansCount(history.length)}</Text>
        </View>
        {hasPending && (
          <TouchableOpacity style={[styles.syncBtn, CARD_SHADOW]} onPress={syncPendingScans} disabled={isLoading}>
            <Ionicons name="sync" size={14} color={AG.warning} />
            <Text style={styles.syncBtnText}>{isLoading ? t.syncing : t.sync}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshHistory} colors={[AG.accentGreen]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, CARD_SHADOW]}>
              <Ionicons name="leaf-outline" size={40} color={AG.muted} />
            </View>
            <Text style={styles.emptyTitle}>{t.noScansTitle}</Text>
            <Text style={styles.emptySub}>{t.noScansSub}</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/scan')}>
              <Text style={styles.emptyCtaText}>{t.scanCta}</Text>
            </TouchableOpacity>
          </View>
        }
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={AG.disease} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AG.bgMain },
  centered: { flex: 1, backgroundColor: AG.bgMain, justifyContent: 'center', alignItems: 'center' },
  centeredLabel: { marginTop: 14, fontSize: 15, color: AG.textSecondary },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: AG.textPrimary },
  headerSub: { fontSize: 12, color: AG.muted, marginTop: 2, letterSpacing: 0.2 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AG.bgCard,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
  },
  syncBtnText: { fontSize: 12, fontWeight: '700', color: AG.warning },

  listContent: { paddingHorizontal: 20, paddingBottom: 100, flexGrow: 1 },

  /* Card */
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AG.bgCard,
    borderRadius: 20, padding: 14, marginBottom: 12,
  },
  thumbFrame: {
    marginRight: 14, borderRadius: 14, borderWidth: 1, borderColor: AG.border, overflow: 'hidden',
  },
  thumb: { width: 58, height: 58, borderRadius: 13 },
  thumbPlaceholder: { backgroundColor: AG.healthyFill, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3,
  },
  diseaseName: {
    fontSize: 15, fontWeight: '700', color: AG.textPrimary, textTransform: 'capitalize', flex: 1, marginRight: 8,
  },
  syncPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  syncLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  dateText: { fontSize: 11, color: AG.muted, marginBottom: 5, letterSpacing: 0.2 },

  /* Confidence */
  confRow: { flexDirection: 'row' },
  confPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  confDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  confText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  /* Empty */
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: AG.bgCard,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: AG.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: AG.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    backgroundColor: AG.accentGreen, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, marginTop: 24,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Error */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: AG.diseaseFill, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#FACAC0', marginBottom: 16,
  },
  errorText: { color: '#7C3A2B', fontSize: 13, flex: 1, fontWeight: '500' },
});
