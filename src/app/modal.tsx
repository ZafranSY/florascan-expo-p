import { Link } from 'expo-router';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSettingsStore } from '@/stores/settingsStore';

const AG = {
  bgMain:       '#F8F9FA',
  bgCard:       '#FFFFFF',
  textPrimary:  '#1C2B24',
  textSecondary:'#5A6B63',
  accentGreen:  '#2D5A43',
  healthyFill:  '#EAF5EE',
  border:       '#E8ECE9',
};

const TRANSLATIONS = {
  en: {
    title: "About FloraScan",
    description: "An advanced agricultural diagnostic platform specifically designed for Papaya pathology detection using deep learning.",
    version: "Version 1.0.0 (Stable)",
    developer: "Developed by Zafran",
    close: "Dismiss"
  },
  bm: {
    title: "Mengenai FloraScan",
    description: "Platform diagnostik pertanian canggih yang direka khusus untuk pengesanan patologi Betik menggunakan pembelajaran mendalam.",
    version: "Versi 1.0.0 (Stabil)",
    developer: "Dibangunkan oleh Zafran",
    close: "Tutup"
  }
};

export default function ModalScreen() {
  const locale = useSettingsStore((state) => state.locale);
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconContainer}>
        <ThemedText style={styles.iconText}>🌿</ThemedText>
      </View>
      
      <ThemedText style={styles.title}>{t.title}</ThemedText>
      <ThemedText style={styles.description}>{t.description}</ThemedText>
      
      <View style={styles.infoCard}>
        <ThemedText style={styles.infoText}>{t.version}</ThemedText>
        <View style={styles.divider} />
        <ThemedText style={styles.infoText}>{t.developer}</ThemedText>
      </View>

      <Link href="/" dismissTo asChild>
        <TouchableOpacity style={styles.closeButton}>
          <ThemedText style={styles.closeButtonText}>{t.close}</ThemedText>
        </TouchableOpacity>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: AG.bgMain,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AG.healthyFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: AG.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: AG.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: AG.bgCard,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: AG.border,
    alignItems: 'center',
    marginBottom: 40,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: AG.textPrimary,
  },
  divider: {
    height: 1,
    width: '40%',
    backgroundColor: AG.border,
    marginVertical: 12,
  },
  closeButton: {
    backgroundColor: AG.accentGreen,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: AG.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

