/**
 * 99 Names of Allah — scrollable list with Arabic, transliteration, and meaning.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { BackToHomeBar } from '../src/components/BackToHomeBar';
import { GlassCard } from '../src/components/GlassCard';
import { ASMA_UL_HUSNA } from '../src/constants/asmaUlHusna';
import { getString, formatNumber } from '../src/constants/i18n';
import { spacing, radius } from '../src/theme/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from '../src/theme/typography';

export default function NamesScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const title = getString(language, 'namesOfAllahTitle');
  const subtitle = getString(language, 'namesOfAllahSubtitle');

  const cardText = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const cardTextSecondary = isRoyal ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const cardTextMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;
  const goldAccent = '#E6C27A';

  const ListHeaderComponent = useCallback(
    () => (
      <View style={styles.header}>
        <BackToHomeBar />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
    ),
    [title, subtitle, colors.text, colors.textMuted]
  );

  return (
    <ScreenWrapper>
      <FlatList
        data={ASMA_UL_HUSNA}
        keyExtractor={(item) => String(item.id)}
        style={styles.flatList}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.xxl + 72 }]}
        ListHeaderComponent={ListHeaderComponent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <GlassCard padding="md" rounded="lg" style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={[styles.number, { color: isRoyal ? goldAccent : cardTextMuted }]}>{formatNumber(language, item.id)}</Text>
              <Text style={[styles.arabic, { color: cardText }]}>{item.arabic}</Text>
            </View>
            <Text style={[styles.transliteration, { color: cardTextSecondary }]}>{item.transliteration}</Text>
            <Text style={[styles.meaning, { color: cardTextMuted }]}>{item.meaning}</Text>
          </GlassCard>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.heading,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  flatList: { flex: 1 },
  list: { paddingHorizontal: spacing.lg },
  card: { borderRadius: radius.lg },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  number: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  arabic: {
    flex: 1,
    textAlign: 'right',
    fontSize: fontSize.lg,
    fontFamily: fontFamily.arabic,
  },
  transliteration: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  meaning: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
});
