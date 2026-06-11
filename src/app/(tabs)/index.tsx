import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ThemedView } from '@/components/themed-view';
import { SPACING, BORDER_RADIUS } from '@/utils/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db, logTipFeedback } from '@/services/databaseService';
import { useSettingsStore } from '@/stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';

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
  trackBg:      '#E5E7EB',
  border:       '#E8ECE9',
  muted:        '#8A9B91',
};

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 2,
};

// Non-target labels excluded from papaya health calculation
const NON_TARGET_LABELS = ['non-papaya', 'invalid scan', 'unknown plant', 'non-papaya/unknown'];

interface FarmStats {
  totalAll: number;
  validPapaya: number;
  healthy: number;
  diseased: number;
  nonTarget: number;
  healthRatio: number;
}

const TRANSLATIONS = {
  en: {
    greeting: "Welcome back,",
    readyMsg: "Ready to check your crops today?",
    ctaTitle: "Begin Diagnostic Scan",
    ctaSubtext: "Capture a leaf for instant AI advice",
    analyticsTitle: "Farm Analytics",
    validScans: "Valid Scans",
    healthy: "Healthy",
    diseases: "Diseases",
    nonTarget: "Non-Target",
    healthRatio: "Crop Health Ratio",
    excludedNote: (count: number) => `${count} non-papaya scan${count !== 1 ? 's' : ''} excluded from ratio`,
    envTitle: "Environmental Outlook",
    temp: "Temp",
    humidity: "Humidity",
    condition: "Condition",
    outbreakRisk: "OUTBREAK RISK",
    quickTips: "Quick Tips",
    tips: [
      "Ensure the leaf is well-lit by natural sunlight.",
      "Hold the camera steady and keep the diseased area in focus.",
      "Only scan one leaf at a time for accurate results.",
    ],
    climate: {
      condition: "Thunderstorm",
      riskLevel: "HIGH",
      targetDisease: "Anthracnose & Bacterial Spot",
    },
    dailyTipTitle: "🌱 Plant Care Tip of the Day",
    loadingTip: "Loading care tip...",
    plantCareTips: [
      "Ensure proper soil drainage to prevent Phytophthora root rot during heavy rain seasons.",
      "Regularly check under leaf surfaces for hidden whitefly or spider mite clusters.",
      "Keep tools sterilized between plants to prevent the mechanical spread of Papaya Ringspot Virus."
    ],
    feedbackQuestion: "Was this tip helpful?",
    feedbackThanks: "✓ Thanks for your feedback!",
    helpful: "Helpful",
    notHelpful: "Not Helpful",
    today: "TODAY",
    appTitle: "FloraScan",
    farmer: "Farmer",
    outbreakMsg: (target: string) => `High atmospheric moisture accelerates spore distribution. Inspect lower branches for early ${target} lesions.`
  },
  bm: {
    greeting: "Selamat kembali,",
    readyMsg: "Sedia untuk memeriksa tanaman anda hari ini?",
    ctaTitle: "Mulakan Imbasan Diagnostik",
    ctaSubtext: "Ambil gambar daun untuk nasihat AI segera",
    analyticsTitle: "Analitik Ladang",
    validScans: "Imbasan Sah",
    healthy: "Sihat",
    diseases: "Penyakit",
    nonTarget: "Bukan Sasaran",
    healthRatio: "Nisbah Kesihatan Tanaman",
    excludedNote: (count: number) => `${count} imbasan bukan betik dikecualikan daripada nisbah`,
    envTitle: "Tinjauan Persekitaran",
    temp: "Suhu",
    humidity: "Kelembapan",
    condition: "Ribut Petir",
    outbreakRisk: "RISIKO WABAK",
    quickTips: "Tips Pantas",
    tips: [
      "Pastikan daun mendapat cahaya matahari semula jadi yang mencukupi.",
      "Pegang kamera dengan stabil dan fokus pada kawasan yang berpenyakit.",
      "Hanya imbas satu daun pada satu masa untuk keputusan yang tepat.",
    ],
    climate: {
      condition: "Ribut Petir",
      riskLevel: "TINGGI",
      targetDisease: "Antraknosa & Bintik Bakteria",
    },
    dailyTipTitle: "🌱 Tip Penjagaan Tumbuhan Hari Ini",
    loadingTip: "Memuatkan tip penjagaan...",
    plantCareTips: [
      "Pastikan saliran tanah yang baik untuk mengelakkan reput akar Phytophthora semasa musim hujan lebat.",
      "Periksa di bawah permukaan daun secara kerap untuk mengesan kluster lalat putih atau hama labah-labah.",
      "Pastikan alatan disanitasi antara pokok untuk mengelakkan penyebaran mekanikal Virus Bintik Bergelang Betik."
    ],
    feedbackQuestion: "Adakah tip ini membantu?",
    feedbackThanks: "✓ Terima kasih atas maklum balas anda!",
    helpful: "Bermanfaat",
    notHelpful: "Kurang Bermanfaat",
    today: "HARI INI",
    appTitle: "FloraScan",
    farmer: "Petani",
    outbreakMsg: (target: string) => `Kelembapan atmosfera yang tinggi mempercepatkan penyebaran spora. Periksa dahan bawah untuk kesan lesi ${target} awal.`
  }
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { locale } = useSettingsStore();
  const router = useRouter();
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const [stats, setStats] = useState<FarmStats>({
    totalAll: 0, validPapaya: 0, healthy: 0, diseased: 0, nonTarget: 0, healthRatio: 0,
  });

  useFocusEffect(
    useCallback(() => {
      try {
        const rows = db.getAllSync<{ disease: string }>('SELECT disease FROM scans');
        const totalAll = rows.length;
        const nonTarget = rows.filter(r => NON_TARGET_LABELS.includes(r.disease.toLowerCase())).length;
        const validPapaya = totalAll - nonTarget;
        const healthy = rows.filter(r => r.disease.toLowerCase() === 'healthy').length;
        const diseased = validPapaya - healthy;
        const healthRatio = validPapaya > 0 ? (healthy / validPapaya) * 100 : 0;
        setStats({ totalAll, validPapaya, healthy, diseased, nonTarget, healthRatio });
      } catch (e) { /* SQLite not ready */ }
    }, [])
  );

  const localClimate = {
    temp: '31°C', humidity: '88%', condition: t.climate.condition,
    riskLevel: t.climate.riskLevel, targetDisease: t.climate.targetDisease,
  };

  const quickTips = [
    { icon: 'lightbulb.fill', text: t.tips[0], color: AG.warning },
    { icon: 'camera.viewfinder', text: t.tips[1], color: AG.accentGreen },
    { icon: 'leaf.fill', text: t.tips[2], color: AG.healthy },
  ];

  const healthColor = stats.healthRatio >= 70 ? AG.healthy : stats.healthRatio >= 40 ? AG.warning : AG.disease;

  // ── UC014 Task 2: Tip of the Day Rotation Logic ──
  // Calculate day of year to provide a consistent daily rotation
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const tipList = t.plantCareTips || [];
  const tipIndex = tipList.length > 0 ? dayOfYear % tipList.length : 0;
  const currentTip = tipList[tipIndex] || t.loadingTip;

  return (
    <View style={styles.screenBg}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.greeting}</Text>
            <Text style={styles.userName}>{user?.name || t.farmer}!</Text>
          </View>
          <View style={styles.avatarCircle}>
            <IconSymbol name="person.fill" size={22} color={AG.accentGreen} />
          </View>
        </View>

        <Text style={styles.subtext}>{t.readyMsg}</Text>

        {/* ── Diagnostic CTA Card ── */}
        <TouchableOpacity
          style={[styles.ctaCard, CARD_SHADOW]}
          onPress={() => router.navigate('/scan')}
          activeOpacity={0.85}
        >
          <View style={styles.ctaLeft}>
            <View style={styles.ctaIconWrap}>
              <IconSymbol name="leaf.fill" size={26} color={AG.accentGreen} />
            </View>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>{t.ctaTitle}</Text>
              <Text style={styles.ctaSubtext}>{t.ctaSubtext}</Text>
            </View>
          </View>
          <View style={styles.ctaCameraBtn}>
            <IconSymbol name="camera.fill" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* ── Farm Analytics ── */}
        <View style={[styles.card, CARD_SHADOW]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="chart.bar.fill" size={16} color={AG.accentGreen} />
            <Text style={styles.cardHeaderText}>{t.analyticsTitle}</Text>
          </View>

          <View style={styles.metricsGrid}>
            {/* Valid Scans */}
            <View style={styles.metricBox}>
              <Text style={[styles.metricNum, { color: AG.textPrimary }]}>{stats.validPapaya}</Text>
              <Text style={styles.metricLab}>{t.validScans}</Text>
            </View>
            {/* Healthy */}
            <View style={styles.metricBox}>
              <View style={[styles.metricCapsule, { backgroundColor: AG.healthyFill }]}>
                <Text style={[styles.metricNum, { color: AG.healthy }]}>{stats.healthy}</Text>
              </View>
              <Text style={styles.metricLab}>{t.healthy}</Text>
            </View>
            {/* Diseases */}
            <View style={styles.metricBox}>
              <View style={[styles.metricCapsule, { backgroundColor: AG.diseaseFill }]}>
                <Text style={[styles.metricNum, { color: AG.disease }]}>{stats.diseased}</Text>
              </View>
              <Text style={styles.metricLab}>{t.diseases}</Text>
            </View>
            {/* Non-Target */}
            <View style={styles.metricBox}>
              <View style={[styles.metricCapsule, { backgroundColor: '#F1F3F2' }]}>
                <Text style={[styles.metricNum, { color: AG.muted }]}>{stats.nonTarget}</Text>
              </View>
              <Text style={styles.metricLab}>{t.nonTarget}</Text>
            </View>
          </View>

          {/* Health Ratio */}
          <View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLab}>{t.healthRatio}</Text>
              <Text style={[styles.progressVal, { color: healthColor }]}>
                {stats.validPapaya > 0 ? `${stats.healthRatio.toFixed(1)}%` : '--'}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${stats.healthRatio}%` as any, backgroundColor: healthColor }]} />
            </View>
            {stats.nonTarget > 0 && (
              <Text style={styles.excludedNote}>
                {t.excludedNote(stats.nonTarget)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Environmental Outlook ── */}
        <Text style={styles.sectionTitle}>{t.envTitle}</Text>
        <View style={[styles.card, CARD_SHADOW]}>
          <View style={styles.climateRow}>
            <View style={styles.climateItem}>
              <IconSymbol name="thermometer" size={18} color={AG.disease} />
              <View>
                <Text style={styles.climateVal}>{localClimate.temp}</Text>
                <Text style={styles.climateLab}>{t.temp}</Text>
              </View>
            </View>
            <View style={styles.climateDivider} />
            <View style={styles.climateItem}>
              <IconSymbol name="drop.fill" size={16} color="#5B8DEF" />
              <View>
                <Text style={styles.climateVal}>{localClimate.humidity}</Text>
                <Text style={styles.climateLab}>{t.humidity}</Text>
              </View>
            </View>
            <View style={styles.climateDivider} />
            <View style={styles.climateItem}>
              <IconSymbol name="cloud.bolt.rain.fill" size={18} color={AG.muted} />
              <View>
                <Text style={styles.climateVal}>{localClimate.condition}</Text>
                <Text style={styles.climateLab}>{t.condition}</Text>
              </View>
            </View>
          </View>

          {/* Outbreak Alert */}
          <View style={styles.outbreakBanner}>
            <View style={styles.outbreakHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={AG.disease} />
              <Text style={styles.outbreakTitle}>{t.outbreakRisk}: {localClimate.riskLevel}</Text>
            </View>
            <Text style={styles.outbreakBody}>
              {t.climate.riskLevel === 'TINGGI' || t.climate.riskLevel === 'HIGH' 
                ? t.outbreakMsg(t.climate.targetDisease)
                : ''}
            </Text>
          </View>
        </View>



        {/* ── Quick Tips ── */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>{t.quickTips}</Text>
        {quickTips.map((tip, i) => (
          <View key={i} style={[styles.tipCard, CARD_SHADOW]}>
            <View style={[styles.tipIcon, { backgroundColor: tip.color + '18' }]}>
              <IconSymbol name={tip.icon as any} size={18} color={tip.color} />
            </View>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}

        {/* ── Daily Tip Section (UC014 Logic Complete) ── */}
        <View 
          style={[styles.dailyTipCard, CARD_SHADOW]} 
        >
          <View style={styles.dailyTipHeader}>
            <View style={styles.dailyTipIconCircle}>
              <IconSymbol name="paperplane.fill" size={16} color={AG.healthy} />
            </View>
            <Text style={styles.dailyTipTitle}>{t.dailyTipTitle}</Text>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{t.today}</Text>
            </View>
          </View>
          <View style={styles.dailyTipContent}>
            <Text style={styles.dailyTipText}>
              {currentTip}
            </Text>
            {!hasVoted ? (
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackQuestion}>{t.feedbackQuestion}</Text>
                <View style={styles.feedbackActions}>
                  <TouchableOpacity 
                    style={styles.feedbackButton} 
                    onPress={async () => {
                      await logTipFeedback(tipIndex, 1);
                      setHasVoted(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="thumbs-up-outline" size={12} color={AG.healthy} />
                    <Text style={[styles.feedbackButtonText, { color: AG.healthy }]}>{(t as any).helpful}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.feedbackButton} 
                    onPress={async () => {
                      await logTipFeedback(tipIndex, -1);
                      setHasVoted(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="thumbs-down-outline" size={12} color={AG.disease} />
                    <Text style={[styles.feedbackButtonText, { color: AG.disease }]}>{(t as any).notHelpful}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.feedbackRow}>
                <View style={styles.feedbackThanksBadge}>
                  <Text style={styles.feedbackThanksText}>{t.feedbackThanks}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: AG.bgMain },
  scrollContent: { padding: 20, paddingTop: 60 },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  greeting: { fontSize: 16, fontWeight: '400', color: AG.textSecondary },
  userName: { fontSize: 26, fontWeight: '800', color: AG.textPrimary },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: AG.healthyFill, justifyContent: 'center', alignItems: 'center',
  },
  subtext: { fontSize: 14, color: AG.textSecondary, marginBottom: 24 },

  /* CTA */
  ctaCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: AG.bgCard, padding: 18, borderRadius: 20, marginBottom: 20,
  },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  ctaIconWrap: {
    width: 50, height: 50, borderRadius: 16, backgroundColor: AG.healthyFill,
    justifyContent: 'center', alignItems: 'center',
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: AG.textPrimary },
  ctaSubtext: { fontSize: 12, color: AG.textSecondary, marginTop: 2 },
  ctaCameraBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: AG.accentGreen,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Card shared */
  card: {
    backgroundColor: AG.bgCard, borderRadius: 20, padding: 20, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  cardHeaderText: { fontSize: 14, fontWeight: '700', color: AG.textPrimary, letterSpacing: 0.2 },

  /* Metrics 4-grid */
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricBox: { flex: 1, alignItems: 'center' },
  metricCapsule: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  metricNum: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  metricLab: {
    fontSize: 9, fontWeight: '700', color: AG.textSecondary, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center',
  },

  /* Progress */
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  progressLab: { fontSize: 12, fontWeight: '600', color: AG.textSecondary },
  progressVal: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: AG.trackBg, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  excludedNote: {
    fontSize: 10, fontStyle: 'italic', color: AG.muted, marginTop: 6, textAlign: 'center',
  },

  /* Climate */
  climateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingHorizontal: 2,
  },
  climateItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  climateVal: { fontSize: 14, fontWeight: '700', color: AG.textPrimary },
  climateLab: { fontSize: 9, fontWeight: '600', color: AG.textSecondary, textTransform: 'uppercase' },
  climateDivider: { width: 1, height: 28, backgroundColor: AG.border },

  outbreakBanner: {
    backgroundColor: AG.diseaseFill, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FACAC0', borderLeftWidth: 4, borderLeftColor: AG.disease,
  },
  outbreakHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  outbreakTitle: { fontSize: 11, fontWeight: '900', color: AG.disease, letterSpacing: 0.4 },
  outbreakBody: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: '#7C3A2B' },

  /* Section */
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: AG.textPrimary, marginBottom: 12,
  },

  /* Tips */
  tipCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AG.bgCard,
    padding: 16, borderRadius: 16, marginBottom: 10,
  },
  tipIcon: {
    width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, color: AG.textSecondary },

  /* Daily Tip (UC014) */
  dailyTipCard: {
    backgroundColor: AG.bgCard,
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: AG.border,
  },
  dailyTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dailyTipIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: AG.healthyFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyTipTitle: {
    color: AG.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dailyTipContent: {
    backgroundColor: '#F9FBFA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(67, 137, 100, 0.1)',
  },
  dailyTipText: {
    color: AG.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  todayBadge: {
    backgroundColor: AG.accentGreen,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  feedbackQuestion: {
    fontSize: 11,
    fontWeight: '600',
    color: AG.muted,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: AG.border,
    ...CARD_SHADOW,
  },
  feedbackButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackThanksBadge: {
    flex: 1,
    backgroundColor: AG.healthyFill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackThanksText: {
    fontSize: 12,
    fontWeight: '700',
    color: AG.healthy,
  },
});
