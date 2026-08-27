/**
 * Support us — donation link plus a share shortcut.
 *
 * SUPPORT_PAYPAL_URL is the only thing to change when the PayPal.me / donate
 * link is ready; an empty string hides the button and shows a short note.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { getString, translations } from '../../../constants/i18n';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { hapticLight } from '../../../utils/haptics';
import { countGiftButtonTap } from '../../../services/metrics';

/** PayPal donation link (customer's paypal.me). Empty string hides the button. */
export const SUPPORT_PAYPAL_URL = 'https://paypal.me/rburhank';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.rami.burhank';

export function SupportScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();

  const t = (key: Parameters<typeof getString>[1]) => getString(language, key);
  const gold = isRoyal ? '#E6C27A' : colors.highlight;
  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const textSecondary = isRoyal ? 'rgba(255,255,255,0.75)' : colors.textSecondary;

  const handleDonate = useCallback(async () => {
    if (!SUPPORT_PAYPAL_URL) {
      Alert.alert(t('supportUs'), t('supportUsUnavailable'));
      return;
    }
    await hapticLight();
    // Counted before the hand-off, since opening the URL leaves the app.
    countGiftButtonTap();
    try {
      await Linking.openURL(SUPPORT_PAYPAL_URL);
    } catch {
      Alert.alert(t('supportUs'), t('supportUsUnavailable'));
    }
  }, [language]);

  const handleShare = useCallback(async () => {
    const appName = translations[language]?.appName ?? translations.en.appName;
    try {
      await Share.share({
        message: `${appName}\n${STORE_URL}`,
        title: appName,
        url: Platform.OS === 'ios' ? STORE_URL : undefined,
      });
    } catch {
      /* user dismissed */
    }
  }, [language]);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackToHomeBar />
          <Text style={[styles.title, { color: colors.text }]}>{t('supportUs')}</Text>
        </View>

        <GlassCard padding="lg" rounded="lg">
          <View style={[styles.heartWrap, { borderColor: isRoyal ? 'rgba(230,194,122,0.35)' : colors.accentMuted, backgroundColor: isRoyal ? 'rgba(230,194,122,0.14)' : colors.highlightGlow }]}>
            <Ionicons name="heart" size={26} color={gold} />
          </View>
          <Text style={[styles.intro, { color: textSecondary }]}>{t('supportUsIntro')}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => void handleDonate()}
            style={[
              styles.primaryButton,
              {
                backgroundColor: isRoyal ? 'rgba(230,194,122,0.18)' : colors.highlightGlow,
                borderColor: gold,
              },
            ]}
          >
            <Ionicons name="logo-paypal" size={20} color={gold} />
            <Text style={[styles.primaryButtonText, { color: gold }]}>{t('supportUsPaypal')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => void handleShare()}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Ionicons name="share-social-outline" size={20} color={textPrimary} />
            <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>
              {t('supportUsShare')}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.thanks, { color: gold }]}>{t('supportUsThanks')}</Text>
        </GlassCard>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
  },
  heartWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  intro: {
    fontSize: fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  primaryButtonText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  thanks: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
