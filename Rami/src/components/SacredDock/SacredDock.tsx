/**
 * Sacred Dock: floating pill-shaped glass bar.
 * Icons only — Prayer (crescent) | Quran (book) | Qibla (compass) | Forum (messages) | Settings (gear).
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDockVisibility } from './DockVisibilityContext';
import { getString } from '../../constants/i18n';
import type { StringTranslationKey } from '../../constants/i18n';
import { spacing, radius } from '../../theme/spacing';

type DockIconName = 'prayer' | 'quran' | 'bukhari' | 'qibla' | 'qa' | 'forum' | 'settings';

// Large icons and touch targets for accessibility (older users)
const ICON_SIZE = 36;
const STROKE = 2.4;

const DOCK_ITEMS: { i18nKey: StringTranslationKey; href: string; pathMatch: string; icon: DockIconName }[] = [
  { i18nKey: 'navPrayer', href: '/', pathMatch: 'index', icon: 'prayer' },
  { i18nKey: 'navQuran', href: '/quran', pathMatch: 'quran', icon: 'quran' },
  { i18nKey: 'navBukhari', href: '/bukhari', pathMatch: 'bukhari', icon: 'bukhari' },
  { i18nKey: 'navQibla', href: '/qibla', pathMatch: 'qibla', icon: 'qibla' },
  { i18nKey: 'navForum', href: '/forum', pathMatch: 'forum', icon: 'forum' },
  { i18nKey: 'navSettings', href: '/settings', pathMatch: 'settings', icon: 'settings' },
];

function DockIcon({ name, color }: { name: DockIconName; color: string }) {
  const strokeProps = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  switch (name) {
    case 'prayer':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...strokeProps} />
        </Svg>
      );
    case 'quran':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...strokeProps} />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...strokeProps} />
        </Svg>
      );
    case 'bukhari':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4z" {...strokeProps} />
          <Path d="M7 4v19" {...strokeProps} />
          <Path d="M10 9h7M10 13h7" {...strokeProps} />
        </Svg>
      );
    case 'qibla':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" {...strokeProps} />
          <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" {...strokeProps} />
        </Svg>
      );
    case 'forum':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...strokeProps} />
        </Svg>
      );
    case 'qa':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...strokeProps} />
          <Path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.8-1.1 1.8" {...strokeProps} />
          <Path d="M12 16h.01" {...strokeProps} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <Path
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.217.128.329.21.738.26 1.099.11l1.2-.5c.51-.212 1.096.002 1.37.5l1.296 2.247c.274.499.19 1.124-.2 1.5l-.919.88c-.258.247-.402.59-.41.943a6.02 6.02 0 000 .253c.008.353.152.696.41.943l.92.88c.389.376.473 1.001.199 1.5l-1.296 2.247c-.274.499-.86.713-1.37.5l-1.2-.5a1.125 1.125 0 00-1.1.11c-.069.045-.142.088-.216.128-.332.184-.582.496-.645.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.592c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 00-.645-.87 6.52 6.52 0 01-.216-.128 1.125 1.125 0 00-1.1-.11l-1.2.5c-.51.212-1.096-.002-1.37-.5L2.92 15.5c-.274-.499-.19-1.124.2-1.5l.919-.88c.258-.247.402-.59.41-.943a6.02 6.02 0 000-.253 1.125 1.125 0 00-.41-.943l-.92-.88c-.389-.376-.473-1.001-.199-1.5L4.216 5.6c.274-.499.86-.713 1.37-.5l1.2.5c.36.15.77.1 1.099-.11.07-.045.143-.088.217-.128.332-.184.582-.496.645-.87l.213-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            {...strokeProps}
          />
        </Svg>
      );
  }
}

function isActive(pathname: string, pathMatch: string): boolean {
  if (pathMatch === 'index') return pathname === '/' || pathname === '/(tabs)' || pathname.endsWith('/(tabs)') || pathname === '';
  return pathname.includes(pathMatch);
}

export function SacredDock() {
  const { colors, scheme, style: themeStyle } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { dockVisible } = useDockVisibility();

  if (!dockVisible) return null;

  // Royal mode: dark glass with gold border
  const isRoyal = themeStyle === 'royal';
  const dockFill = isRoyal
    ? 'rgba(10, 25, 18, 0.92)'
    : scheme === 'dark'
      ? 'rgba(13, 15, 14, 0.92)'
      : 'rgba(255, 255, 255, 0.92)';

  // Royal mode: gold border for contrast
  const dockBorder = isRoyal
    ? 'rgba(230, 194, 122, 0.35)'
    : colors.border;

  return (
    <View
      style={[styles.overlay, { paddingBottom: insets.bottom + spacing.sm }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: dockFill,
            borderColor: dockBorder,
          },
        ]}
      >
        {DOCK_ITEMS.map((item) => {
          const active = isActive(pathname, item.pathMatch);
          const label = getString(language, item.i18nKey);
          // Royal: gold active, light white inactive
          const itemColor = isRoyal
            ? (active ? '#E6C27A' : 'rgba(255,255,255,0.7)')
            : (active ? colors.highlight : colors.textOnSurface);
          return (
            <TouchableOpacity
              key={item.pathMatch}
              activeOpacity={0.7}
              onPress={() => router.push(item.href as any)}
              accessibilityLabel={label}
              style={styles.item}
            >
              <DockIcon name={item.icon} color={itemColor} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    marginHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
