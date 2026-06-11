import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '../stores/scanStore';
import { apiService } from '../services/api';
import { useSettingsStore } from '../stores/settingsStore';
import { offlineQueue } from '../services/offlineQueue';
import { resolveImageUri } from '../utils/constants';


// ── Grounded AgTech Design Tokens ──
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
  errorBorder:  '#FACAC0',
  muted:        '#8A9B91',
};

const TRANSLATIONS = {
  en: {
    noData: 'No scan data available.',
    goBack: 'Go Back',
    diagnosisResults: 'Diagnosis Results',
    invalidTarget: 'Invalid Target Detected',
    invalidTargetBody: 'The system identified this as a non-papaya object. AI treatment analysis is only available for valid papaya foliage scans.',
    validTargetInfo: 'Our ML model identified this condition. View the AI-generated treatment plan for detailed organic recovery steps.',
    treatmentBtn: 'Treatment Solutions',
    scanAnother: 'Scan Another Plant',
    dualDiagnosisTitle: 'Dual Condition Detected',
    dualDiagnosisBody: 'The system has identified a secondary condition alongside the primary infection. We have prepared an integrated treatment strategy below.',
    primaryCondition: 'Primary Condition',
    secondaryCondition: 'Secondary Condition',
    badges: {
      verified: 'Server Verified',
      high: 'High Confidence',
      moderate: 'Moderate',
      low: 'Low Confidence',
    },
    diseaseNames: {
      'Anthracnose': 'Anthracnose',
      'Bacterial Spot': 'Bacterial Spot',
      'Mites': 'Mites',
      'Yellow Leaf Curl': 'Yellow Leaf Curl',
      'Powdery Mildew': 'Powdery Mildew',
      'Mealybug': 'Mealybug',
      'Phytophthora': 'Phytophthora',
      'Healthy': 'Healthy',
      'Non-Papaya': 'Non-Papaya',
    }
  },
  bm: {
    noData: 'Tiada data imbasan tersedia.',
    goBack: 'Kembali',
    diagnosisResults: 'Keputusan Diagnosis',
    invalidTarget: 'Sasaran Tidak Sah Dikesan',
    invalidTargetBody: 'Sistem mengenal pasti ini sebagai objek bukan betik. Analisis rawatan AI hanya tersedia untuk imbasan daun betik yang sah.',
    validTargetInfo: 'Model ML kami mengenal pasti keadaan ini. Lihat pelan rawatan yang dijana AI untuk langkah pemulihan organik yang terperinci.',
    treatmentBtn: 'Penyelesaian Rawatan',
    scanAnother: 'Imbas Pokok Lain',
    dualDiagnosisTitle: 'Dua Keadaan Dikesan',
    dualDiagnosisBody: 'Sistem telah mengenal pasti keadaan kedua di samping jangkitan utama. Kami telah menyediakan strategi rawatan bersepadu di bawah.',
    primaryCondition: 'Keadaan Utama',
    secondaryCondition: 'Keadaan Kedua',
    badges: {
      verified: 'Disahkan Server',
      high: 'Keyakinan Tinggi',
      moderate: 'Sederhana',
      low: 'Keyakinan Rendah',
    },
    diseaseNames: {
      'Anthracnose': 'Antraknos',
      'Bacterial Spot': 'Bintik Bakteria',
      'Mites': 'Hama',
      'Yellow Leaf Curl': 'Kerul Daun Kuning',
      'Powdery Mildew': 'Kulat Berdebu',
      'Mealybug': 'Koya',
      'Phytophthora': 'Phytophthora',
      'Healthy': 'Sihat',
      'Non-Papaya': 'Bukan Betik',
    }
  },
};

const NON_TARGET = ['non-papaya', 'invalid scan', 'unknown plant'];

const formatDiseaseName = (name: string) =>
  name.replace(/[_-]/g, ' ').split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const getConfidenceBadge = (confidence: number, modelVersion: string, t: any) => {
  if (modelVersion === 'server-fallback' || confidence < 0.3)
    return { label: t.badges.verified, color: AG.accentGreen };
  if (confidence >= 0.7) return { label: t.badges.high, color: AG.healthy };
  if (confidence >= 0.5) return { label: t.badges.moderate, color: AG.warning };
  return { label: t.badges.low, color: AG.disease };
};

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentScan, setCurrentScan, currentTreatment, setCurrentTreatment } = useScanStore();
  const { locale } = useSettingsStore();
  const [isFetchingTreatment, setIsFetchingTreatment] = useState(false);

  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const isNonTarget = currentScan
    ? NON_TARGET.includes(currentScan.disease.toLowerCase())
    : false;

  // Fetch treatment on-demand only for valid papaya scans
  useEffect(() => {
    if (currentScan && !isNonTarget) {
      // 1. Check if we already have a valid treatment in the store for this disease
      if (currentTreatment && currentTreatment.disease === currentScan.disease) {
        return;
      }

      // 2. Check if the current scan has a cached treatment plan locally
      if (currentScan.treatment) {
        try {
          const parsed = typeof currentScan.treatment === 'string'
            ? JSON.parse(currentScan.treatment)
            : currentScan.treatment;
          if (parsed && parsed.disease === currentScan.disease) {
            setCurrentTreatment(parsed);
            return;
          }
        } catch (err) {
          console.warn('Failed to parse local scan treatment in ResultScreen:', err);
        }
      }

      // 3. Otherwise, fetch from the API on-demand
      setIsFetchingTreatment(true);
      apiService.getTreatment(currentScan.disease, locale, currentScan.id, currentScan.secondaryDisease)
        .then(plan => {
          setCurrentTreatment(plan);
          if (plan) {
            const updatedScan = {
              ...currentScan,
              treatment: JSON.stringify(plan),
            };
            setCurrentScan(updatedScan);
            offlineQueue.saveScanLocally(updatedScan);
          }
        })
        .catch(err => console.warn('Failed to fetch treatment:', err))
        .finally(() => setIsFetchingTreatment(false));
    }
  }, [currentScan?.id, currentScan?.disease, locale, currentTreatment]);

  if (!currentScan) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="leaf-outline" size={48} color={AG.muted} />
          </View>
          <Text style={styles.emptyText}>{t.noData}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/scan')}>
            <Text style={styles.emptyBtnText}>{t.goBack}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const badge = getConfidenceBadge(currentScan.confidence, currentScan.modelVersion, t);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Back button over image */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 10 }]}
        onPress={() => { setCurrentScan(null); setCurrentTreatment(null); router.replace('/(tabs)/scan'); }}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Scanned Image */}
        <View style={styles.imageWrap}>
          <Image source={{ uri: resolveImageUri(currentScan.imageUri) || undefined }} style={styles.image} resizeMode="cover" />
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.sectionLabel}>{t.diagnosisResults}</Text>

          {currentScan.secondaryDisease ? (
            <View style={styles.dualCard}>
              <View style={styles.dualHeaderRow}>
                <Ionicons name="warning" size={20} color={AG.warning} />
                <Text style={styles.dualHeaderTitle}>{t.dualDiagnosisTitle}</Text>
              </View>
              <Text style={styles.dualHeaderBody}>{t.dualDiagnosisBody}</Text>
              
              <View style={styles.dualDivider} />

              <View style={styles.dualConditionBox}>
                <View style={styles.dualConditionItem}>
                  <Text style={styles.dualConditionLabel}>{t.primaryCondition}</Text>
                  <Text style={styles.dualConditionName}>
                    {t.diseaseNames[currentScan.disease as keyof typeof t.diseaseNames] || formatDiseaseName(currentScan.disease)}
                  </Text>
                  <View style={[styles.miniBadge, { backgroundColor: AG.disease }]}>
                    <Text style={styles.miniBadgeText}>{(currentScan.confidence * 100).toFixed(1)}%</Text>
                  </View>
                </View>

                <View style={styles.dualConditionSeparator} />

                <View style={styles.dualConditionItem}>
                  <Text style={styles.dualConditionLabel}>{t.secondaryCondition}</Text>
                  <Text style={styles.dualConditionName}>
                    {t.diseaseNames[currentScan.secondaryDisease as keyof typeof t.diseaseNames] || formatDiseaseName(currentScan.secondaryDisease)}
                  </Text>
                  <View style={[styles.miniBadge, { backgroundColor: AG.warning }]}>
                    <Text style={styles.miniBadgeText}>
                      {currentScan.secondaryConfidence ? `${(currentScan.secondaryConfidence * 100).toFixed(1)}%` : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.diseaseTitle}>
                {t.diseaseNames[currentScan.disease as keyof typeof t.diseaseNames] || formatDiseaseName(currentScan.disease)}
              </Text>

              {/* Confidence Badge */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: badge.color }]}>
                  <Text style={styles.badgeText}>{(currentScan.confidence * 100).toFixed(1)}%</Text>
                </View>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
              </View>
            </>
          )}

          {/* Conditional: Non-Papaya Warning */}
          {isNonTarget ? (
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={18} color={AG.disease} />
                <Text style={styles.warningTitle}>{t.invalidTarget}</Text>
              </View>
              <Text style={styles.warningBody}>
                {t.invalidTargetBody}
              </Text>
            </View>
          ) : (
            <>
              {/* Info Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  {t.validTargetInfo}
                </Text>
              </View>

              {/* Treatment Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, isFetchingTreatment && { backgroundColor: AG.muted }]}
                onPress={() => router.push('/treatment')}
                disabled={isFetchingTreatment}
              >
                {isFetchingTreatment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.treatmentBtn}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Scan Another */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => { setCurrentScan(null); setCurrentTreatment(null); router.replace('/(tabs)/scan'); }}
          >
            <Text style={styles.secondaryBtnText}>{t.scanAnother}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}


const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AG.bgMain },
  scrollContent: { flexGrow: 1 },

  /* Empty state */
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: AG.healthyFill,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyText: { fontSize: 17, color: AG.textSecondary, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: AG.accentGreen, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 28,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  /* Back */
  backBtn: {
    position: 'absolute', left: 20, zIndex: 10, width: 42, height: 42,
    borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Image */
  imageWrap: { width: '100%', height: 340 },
  image: { width: '100%', height: '100%' },

  /* Content */
  contentCard: {
    backgroundColor: AG.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28, padding: 24, ...SHADOW,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: AG.accentGreen,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  diseaseTitle: { fontSize: 28, fontWeight: '800', color: AG.textPrimary, marginBottom: 14 },

  /* Badge */
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 10 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  badgeLabel: { fontSize: 14, fontWeight: '600', color: AG.textSecondary },

  /* Non-target warning */
  warningCard: {
    backgroundColor: AG.diseaseFill, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: AG.errorBorder, borderLeftWidth: 4, borderLeftColor: AG.disease,
    marginBottom: 20,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warningTitle: { fontSize: 15, fontWeight: '800', color: AG.disease },
  warningBody: { fontSize: 14, lineHeight: 21, color: '#7C3A2B' },

  /* Info card (valid scans) */
  infoCard: {
    backgroundColor: AG.healthyFill, padding: 16, borderRadius: 14, marginBottom: 20,
  },
  infoText: { fontSize: 14, lineHeight: 21, color: AG.textSecondary },

  /* Buttons */
  primaryBtn: {
    height: 54, borderRadius: 28, backgroundColor: AG.accentGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    height: 54, borderRadius: 28, borderWidth: 1.5, borderColor: AG.accentGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: AG.accentGreen },

  /* Dual Disease styles */
  dualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECE9',
    borderLeftWidth: 4,
    borderLeftColor: AG.warning,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  dualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dualHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AG.textPrimary,
  },
  dualHeaderBody: {
    fontSize: 14,
    color: AG.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  dualDivider: {
    height: 1,
    backgroundColor: '#E8ECE9',
    marginVertical: 12,
  },
  dualConditionBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  dualConditionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dualConditionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AG.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dualConditionName: {
    fontSize: 14,
    fontWeight: '800',
    color: AG.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    flexGrow: 1,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dualConditionSeparator: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
});
