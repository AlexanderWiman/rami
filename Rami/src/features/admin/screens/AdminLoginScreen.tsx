/**
 * Admin Login Screen — simple login form.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { GlassCard } from '../../../components/GlassCard';
import { useAdmin } from '../AdminContext';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

export function AdminLoginScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const router = useRouter();
  const { login, isAuthenticated } = useAdmin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass,
      color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text,
      borderColor: isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border,
    },
  ];

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backWrap}>
          <BackBar />
        </View>

        <View style={styles.content}>
          <GlassCard padding="lg" rounded="lg" fillContent={false}>
            <Text
              style={[
                styles.title,
                { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text },
              ]}
            >
              Admin Login
            </Text>

            <TextInput
              style={inputStyle}
              placeholder="Username"
              placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={inputStyle}
              placeholder="Password"
              placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: isRoyal ? '#E6C27A' : colors.highlight },
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
    textAlign: 'center',
    lineHeight: fontSize.xl * 1.35,
    marginBottom: spacing.lg,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loginButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
