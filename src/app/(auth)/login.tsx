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
    subtitle: "Premium Agricultural Diagnostic Suite",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Minimum 8 characters",
    login: "Sign In",
    or: "OR",
    google: "Sign in with Google",
    noAccount: "New to FloraScan? ",
    register: "Create Account",
    forgotPassword: "Forgot Password?",
    errors: {
      'Invalid email or password.': 'Invalid email or password.',
      'This email is already in use.': 'This email is already in use.',
      'The email address is not valid.': 'The email address is not valid.',
      'The password is too weak.': 'The password is too weak.',
      'Network error. Please check your connection.': 'Network error. Please check your connection.',
      'Please fill in all fields.': 'Please fill in all fields.',
      'auth/invalid-email': 'Invalid email address format.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
    }
  },
  bm: {
    subtitle: "Set Diagnostik Pertanian Premium",
    emailLabel: "Alamat Emel",
    emailPlaceholder: "emel@anda.com",
    passwordLabel: "Kata Laluan",
    passwordPlaceholder: "Minimum 8 aksara",
    login: "Log Masuk",
    or: "ATAU",
    google: "Log masuk dengan Google",
    noAccount: "Baru di FloraScan? ",
    register: "Daftar Akaun",
    forgotPassword: "Lupa Kata Laluan?",
    errors: {
      'Invalid email or password.': 'Emel atau kata laluan tidak sah.',
      'This email is already in use.': 'Emel ini telah digunakan.',
      'The email address is not valid.': 'Alamat emel tidak sah.',
      'The password is too weak.': 'Kata laluan terlalu lemah.',
      'Network error. Please check your connection.': 'Ralat rangkaian. Sila semak sambungan anda.',
      'Please fill in all fields.': 'Sila isi semua ruangan.',
      'auth/invalid-email': 'Format alamat emel tidak sah.',
      'auth/user-not-found': 'Tiada akaun ditemui dengan emel ini.',
      'auth/wrong-password': 'Kata laluan salah.',
    }
  }
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const locale = useSettingsStore((state) => state.locale);
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  
  const { loginWithEmail, loginWithGoogle, isLoading, error } = useAuthViewModel();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert(t.errors['Please fill in all fields.'], "");
      return;
    }
    loginWithEmail(email, password);
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
          <Text style={styles.title}>FloraScan</Text>
          <View style={styles.subtitleBadge}>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
        </View>

        <View style={styles.form}>
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
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t.passwordLabel}</Text>
              <TouchableOpacity>
                <Text style={styles.forgotText}>{t.forgotPassword}</Text>
              </TouchableOpacity>
            </View>
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
            style={[styles.loginButton, isLoading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{t.login}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.or}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={[styles.googleButton, isLoading && styles.disabledButton]} 
            onPress={loginWithGoogle}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View style={styles.googleButtonContent}>
              <Text style={styles.googleButtonText}>{t.google}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.noAccount}</Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>{t.register}</Text>
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
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: AG.accentGreen,
    letterSpacing: -1,
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
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: AG.textPrimary,
  },
  forgotText: {
    fontSize: 13,
    color: AG.accentGreen,
    fontWeight: '600',
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
  loginButton: {
    backgroundColor: AG.accentGreen,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: AG.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AG.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: AG.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: AG.border,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    backgroundColor: AG.bgCard,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleButtonText: {
    color: AG.textPrimary,
    fontSize: 16,
    fontWeight: '600',
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

