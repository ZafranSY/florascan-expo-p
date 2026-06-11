import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthViewModel } from '../../viewmodels/useAuthViewModel';
import { useReminderStore } from '../../stores/reminderStore';
import { cancelNotification } from '../../services/notificationService';

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
  warningFill:  '#FDF8F0',
  muted:        '#8A9B91',
  border:       '#E8ECE9',
};

const TRANSLATIONS = {
  en: {
    syncingProfile: "Synchronizing profile...",
    notLoggedIn: "Not logged in",
    success: "Success",
    error: "Error",
    profileSynced: "Profile synced.",
    backendError: "Could not reach backend.",
    syncing: "Syncing...",
    retrySync: "Retry Sync",
    goToLogin: "Go to Login",
    verifiedFarmer: "Verified Farmer",
    location: "Location",
    appClass: "App Class",
    preferences: "Preferences",
    appLanguage: "App Language",
    languageDesc: "Treatment plans & interface",
    offlineCache: "Offline-First Database Cache",
    offlineDesc: "Local SQLite scan synchronization",
    cloudSync: "Cloud Syncing Strategy",
    cloudDesc: "Cloud Pipe Protocol: Cloudflare R2",
    notifications: "Push Notifications",
    notificationsDesc: "Managed via Expo Notification Engine",
    active: "Active",
    account: "Account",
    logout: "Log Out",
    logoutConfirm: "Are you sure you want to log out of FloraScan?",
    cancel: "Cancel",
    loggingOut: "Logging Out...",
    locationVal: "Johor, Malaysia",
    appClassVal: "Enterprise Edition",
    versionInfo: "FloraScan v1.0.0 · UTM Agricultural Systems FYP",
    upcomingReminders: "Upcoming Care Reminders",
    noReminders: "No active reminders.",
    reminderFor: "Spray for",
    scheduledFor: "Scheduled for",
    deleteReminder: "Delete Reminder",
    reminderDeleted: "Reminder deleted.",
    daysSuffix: "days",
  },
  bm: {
    syncingProfile: "Menyegerak profil...",
    notLoggedIn: "Belum log masuk",
    success: "Berjaya",
    error: "Ralat",
    profileSynced: "Profil telah disegerak.",
    backendError: "Tidak dapat menghubungi pelayan.",
    syncing: "Menyegerak...",
    retrySync: "Cuba Lagi",
    goToLogin: "Ke Log Masuk",
    verifiedFarmer: "Petani Sah",
    location: "Lokasi",
    appClass: "Kelas Aplikasi",
    preferences: "Pilihan",
    appLanguage: "Bahasa Aplikasi",
    languageDesc: "Pelan rawatan & antara muka",
    offlineCache: "Cache Pangkalan Data Luar Talian",
    offlineDesc: "Penyegerakan imbasan SQLite tempatan",
    cloudSync: "Strategi Penyegerakan Awan",
    cloudDesc: "Protokol Paip Awan: Cloudflare R2",
    notifications: "Pemberitahuan Tolak",
    notificationsDesc: "Diuruskan melalui Enjin Pemberitahuan Expo",
    active: "Aktif",
    account: "Akaun",
    logout: "Log Keluar",
    logoutConfirm: "Adakah anda pasti mahu log keluar dari FloraScan?",
    cancel: "Batal",
    loggingOut: "Sedang Log Keluar...",
    locationVal: "Johor, Malaysia",
    appClassVal: "Edisi Enterprise",
    versionInfo: "FloraScan v1.0.0 · FYP Sistem Pertanian UTM",
    upcomingReminders: "Peringatan Penjagaan Akan Datang",
    noReminders: "Tiada peringatan aktif.",
    reminderFor: "Semburan untuk",
    scheduledFor: "Dijadualkan pada",
    deleteReminder: "Padam Peringatan",
    reminderDeleted: "Peringatan dipadamkan.",
    daysSuffix: "hari",
  }
};

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.03,
  shadowRadius: 16,
  elevation: 2,
};

export default function ProfileScreen() {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { locale, setLocale } = useSettingsStore();
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  const { logout, refreshProfile, isLoading } = useAuthViewModel();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reminders, removeReminder } = useReminderStore();

  const handleDeleteReminder = async (id: string) => {
    await cancelNotification(id);
    removeReminder(id);
    Alert.alert(t.success, t.reminderDeleted);
  };

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        useAuthStore.getState().setHydrated();
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isInitialized]);

  const handleLogout = () => {
    Alert.alert(t.logout, t.logoutConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.logout, style: 'destructive', onPress: () => logout() },
    ]);
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // ── Loading / Not logged in ──
  if (!user) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.emptyIcon}>
          <Ionicons name="person-outline" size={44} color={AG.muted} />
        </View>
        <Text style={styles.centeredText}>
          {isAuthenticated ? t.syncingProfile : t.notLoggedIn}
        </Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={async () => {
              const ok = await refreshProfile();
              Alert.alert(ok ? t.success : t.error, ok ? t.profileSynced : t.backendError);
            }}
            disabled={isLoading}
          >
            <Ionicons name={isLoading ? 'sync' : 'refresh'} size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.retryBtnText}>{isLoading ? t.syncing : t.retrySync}</Text>
          </TouchableOpacity>
        )}
        {!isAuthenticated && isInitialized && (
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.loginBtnText}>{t.goToLogin}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Authenticated Profile ──
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>

        {/* ── 1. Farmer Profile Header Card ── */}
        <View style={[styles.card, CARD_SHADOW, styles.profileCard]}>
          <View style={styles.profileRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitials(user.name)}</Text>
            </View>
            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name || t.notLoggedIn}</Text>
              <Text style={styles.profileEmail}>{user.email || '—'}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleLabel}>🌾 {t.verifiedFarmer}</Text>
              </View>
            </View>
          </View>

          {/* Agricultural Metadata */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={AG.muted} />
              <Text style={styles.metaText}>{t.location}: {t.locationVal}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="shield-checkmark-outline" size={13} color={AG.muted} />
              <Text style={styles.metaText}>{t.appClass}: {t.appClassVal}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="server-outline" size={13} color={AG.muted} />
              <Text style={styles.metaText}>SQLite + R2</Text>
            </View>
          </View>
        </View>


        {/* ── 2. Upcoming Reminders Section ── */}
        <Text style={styles.sectionLabel}>{t.upcomingReminders}</Text>
        <View style={[styles.card, CARD_SHADOW, { paddingVertical: 10 }]}>
          {reminders.length === 0 ? (
            <View style={styles.emptyReminders}>
              <Ionicons name="notifications-off-outline" size={24} color={AG.muted} />
              <Text style={styles.emptyRemindersText}>{t.noReminders}</Text>
            </View>
          ) : (
            reminders.map((reminder, index) => (
              <React.Fragment key={reminder.id}>
                <View style={styles.reminderItem}>
                  <View style={styles.reminderIcon}>
                    <Ionicons name="calendar-outline" size={20} color={AG.accentGreen} />
                  </View>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderTitle}>
                      {t.reminderFor} {reminder.diseaseName}
                    </Text>
                    <Text style={styles.reminderDate}>
                      {t.scheduledFor}: {new Date(reminder.targetDate).toLocaleDateString(locale === 'bm' ? 'ms-MY' : 'en-US', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })} ({reminder.days} {t.daysSuffix})
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteReminder(reminder.id)}
                    style={styles.deleteReminderBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={AG.disease} />
                  </TouchableOpacity>
                </View>
                {index < reminders.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))
          )}
        </View>

        {/* ── 3. Settings Panel ── */}
        <Text style={styles.sectionLabel}>{t.preferences}</Text>
        <View style={[styles.card, CARD_SHADOW]}>
          {/* Language */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: AG.healthyFill }]}>
                <Ionicons name="language" size={18} color={AG.accentGreen} />
              </View>
              <View>
                <Text style={styles.settingTitle}>{t.appLanguage}</Text>
                <Text style={styles.settingDesc}>{t.languageDesc}</Text>
              </View>
            </View>
            <View style={styles.toggleWrap}>
              <TouchableOpacity
                style={[styles.toggleBtn, locale === 'en' && styles.toggleActive]}
                onPress={() => setLocale('en')}
              >
                <Text style={[styles.toggleText, locale === 'en' && styles.toggleActiveText]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, locale === 'bm' && styles.toggleActive]}
                onPress={() => setLocale('bm')}
              >
                <Text style={[styles.toggleText, locale === 'bm' && styles.toggleActiveText]}>BM</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Offline Cache */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#EDF5FF' }]}>
                <Ionicons name="download-outline" size={18} color="#3A6BA5" />
              </View>
              <View>
                <Text style={styles.settingTitle}>{t.offlineCache}</Text>
                <Text style={styles.settingDesc}>{t.offlineDesc}</Text>
              </View>
            </View>
            <Switch
              value={true}
              disabled={true}
              trackColor={{ false: AG.border, true: AG.healthyFill }}
              thumbColor={AG.healthy}
            />
          </View>

          <View style={styles.divider} />

          {/* Cloud Sync */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#F3F0FF' }]}>
                <Ionicons name="cloud-outline" size={18} color="#6B5CE7" />
              </View>
              <View>
                <Text style={styles.settingTitle}>{t.cloudSync}</Text>
                <Text style={styles.settingDesc}>{t.cloudDesc}</Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={AG.healthy} />
          </View>

          <View style={styles.divider} />

          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: AG.warningFill }]}>
                <Ionicons name="notifications-outline" size={18} color={AG.warning} />
              </View>
              <View>
                <Text style={styles.settingTitle}>{t.notifications}</Text>
                <Text style={styles.settingDesc}>{t.notificationsDesc}</Text>
              </View>
            </View>
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonText}>{t.active}</Text>
            </View>
          </View>
        </View>

        {/* ── 3. Account Actions ── */}
        <Text style={styles.sectionLabel}>{t.account}</Text>
        <View style={[styles.card, CARD_SHADOW]}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={isLoading}>
            <View style={[styles.settingIcon, { backgroundColor: AG.diseaseFill }]}>
              <Ionicons name="log-out-outline" size={18} color={AG.disease} />
            </View>
            <Text style={styles.logoutText}>{isLoading ? t.loggingOut : t.logout}</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={16} color={AG.border} />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>{t.versionInfo}</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AG.bgMain },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centered: {
    flex: 1, backgroundColor: AG.bgMain, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: AG.healthyFill,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  centeredText: { fontSize: 16, fontWeight: '600', color: AG.textSecondary },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AG.accentGreen,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28, marginTop: 24,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loginBtn: {
    backgroundColor: AG.bgCard, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 28, borderWidth: 1.5, borderColor: AG.accentGreen, marginTop: 20,
  },
  loginBtnText: { color: AG.accentGreen, fontSize: 14, fontWeight: '700' },

  /* Card shared */
  card: { backgroundColor: AG.bgCard, borderRadius: 20, marginBottom: 16 },

  /* ── Profile Header ── */
  profileCard: { padding: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatar: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: AG.healthyFill,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: AG.accentGreen },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: AG.textPrimary },
  profileEmail: { fontSize: 13, color: AG.muted, marginTop: 2 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#C6E2D0', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginTop: 8,
  },
  roleLabel: { fontSize: 11, fontWeight: '800', color: AG.accentGreen },

  /* Metadata strip */
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, borderTopColor: AG.border, paddingTop: 14,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600', color: AG.muted },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: AG.border, marginHorizontal: 10 },

  /* ── Section ── */
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: AG.muted, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 10, marginLeft: 4, marginTop: 4,
  },

  /* ── Settings Rows ── */
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  settingIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  settingTitle: { fontSize: 14, fontWeight: '700', color: AG.textPrimary },
  settingDesc: { fontSize: 11, color: AG.muted, marginTop: 1 },
  divider: { height: 1, backgroundColor: AG.border, marginHorizontal: 16 },

  /* Toggle */
  toggleWrap: { flexDirection: 'row', backgroundColor: '#F1F3F2', borderRadius: 10, padding: 3 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  toggleActive: {
    backgroundColor: AG.bgCard,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
  },
  toggleText: { fontSize: 12, fontWeight: '700', color: AG.muted },
  toggleActiveText: { color: AG.accentGreen },

  /* Status pills */
  comingSoonPill: {
    backgroundColor: AG.healthyFill, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  comingSoonText: { fontSize: 10, fontWeight: '700', color: AG.healthy },

  /* Logout */
  logoutRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  logoutText: { fontSize: 15, fontWeight: '700', color: AG.disease },

  /* Version */
  versionText: {
    textAlign: 'center', color: AG.muted, fontSize: 12, marginTop: 20, letterSpacing: 0.2,
  },

  /* ── Upcoming Reminders ── */
  emptyReminders: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyRemindersText: {
    fontSize: 13,
    color: AG.muted,
    fontWeight: '500',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AG.healthyFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AG.textPrimary,
  },
  reminderDate: {
    fontSize: 11,
    color: AG.muted,
    marginTop: 2,
  },
  deleteReminderBtn: {
    padding: 8,
  },
});
