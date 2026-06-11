import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthViewModel } from '@/viewmodels/useAuthViewModel';
import { useSettingsStore } from '@/stores/settingsStore';

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
  muted:        '#8A9B91',
  border:       '#E8ECE9',
};

const TRANSLATIONS = {
  en: {
    title: "Create Account",
    subtitle: "Join the FloraScan Agricultural Network",
    nameLabel: "Full Name",
    namePlaceholder: "e.g. John Doe",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Minimum 8 characters",
    register: "Register",
    haveAccount: "Already have an account? ",
    backToLogin: "Sign In",
    terms: "By registering, you agree to our Terms of Service and Privacy Policy.",
    errors: {
      'Invalid email or password.': 'Invalid email or password.',
      'This email is already in use.': 'This email is already in use.',
      'The email address is not valid.': 'The email address is not valid.',
      'The password is too weak.': 'The password is too weak.',
      'Network error. Please check your connection.': 'Network error. Please check your connection.',
      'Please fill in all fields.': 'Please fill in all fields.',
    }
  },
  bm: {
    title: "Daftar Akaun",
    subtitle: "Sertai Rangkaian Pertanian FloraScan",
    nameLabel: "Nama Penuh",
    namePlaceholder: "cth. Nama Anda",
    emailLabel: "Alamat Emel",
    emailPlaceholder: "emel@anda.com",
    passwordLabel: "Kata Laluan",
    passwordPlaceholder: "Minimum 8 aksara",
    register: "Daftar",
    haveAccount: "Sudah mempunyai akaun? ",
    backToLogin: "Log Masuk",
    terms: "Dengan mendaftar, anda bersetuju dengan Terma Perkhidmatan dan Dasar Privasi kami.",
    errors: {
      'Invalid email or password.': 'Emel atau kata laluan tidak sah.',
      'This email is already in use.': 'Emel ini telah digunakan.',
      'The email address is not valid.': 'Alamat emel tidak sah.',
      'The password is too weak.': 'Kata laluan terlalu lemah.',
      'Network error. Please check your connection.': 'Ralat rangkaian. Sila semak sambungan anda.',
      'Please fill in all fields.': 'Sila isi semua ruangan.',
    }
  }
};

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const locale = useSettingsStore((state) => state.locale);
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  
  const { registerWithEmail, isLoading, error } = useAuthViewModel();

  const handleRegister = () => {
    if (!name || !email || !password) {
      Alert.alert(t.errors['Please fill in all fields.'], "");
      return;
    }
    registerWithEmail(name, email, password);
  };

  const getLocalizedError = (errStr: string | null) => {
    if (!errStr) return null;
    return t.errors[errStr as keyof typeof t.errors] || errStr;
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.title}</Text>
          <View style={styles.subtitleBadge}>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.nameLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.namePlaceholder}
              placeholderTextColor={AG.muted}
              value={name}
              onChangeText={setName}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.emailLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={AG.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.passwordLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={AG.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{getLocalizedError(error)}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.registerButton, isLoading && styles.disabledButton]} 
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>{t.register}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>{t.terms}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.haveAccount}</Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>{t.backToLogin}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AG.bgMain,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: AG.accentGreen,
    letterSpacing: -0.5,
  },
  subtitleBadge: {
    backgroundColor: AG.healthyFill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: AG.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: AG.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: AG.border,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    backgroundColor: AG.bgCard,
    color: AG.textPrimary,
  },
  errorContainer: {
    backgroundColor: '#FFF2F0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD5D0',
  },
  errorText: {
    color: '#C84B31',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: AG.accentGreen,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: AG.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11,
    color: AG.muted,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: AG.textSecondary,
    fontSize: 15,
  },
  linkText: {
    color: AG.accentGreen,
    fontSize: 15,
    fontWeight: '700',
  },
});

