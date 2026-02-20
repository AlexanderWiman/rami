/**
 * UX 2.0: Per-prayer quick settings on long-press pill.
 * Blur background; Notification toggle, Sound toggle, Offset +/-; Save/Cancel.
 * Haptic selection on changes. TODO: Native bottom sheet (e.g. @gorhom/bottom-sheet) for better UX.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getPrayerName, getString } from '../constants/i18n';
import { hapticSelection } from '../utils/haptics';
import { spacing, radius } from '../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../theme/typography';
import type { PrayerName, PrayerSettings } from '../features/prayer/types';

const OFFSET_MIN = -30;
const OFFSET_MAX = 30;

type PrayerQuickSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  prayerName: PrayerName;
  settings: PrayerSettings | null;
  onSave: (updates: Partial<PrayerSettings>) => void;
};

export function PrayerQuickSettingsSheet({
  visible,
  onClose,
  prayerName,
  settings,
  onSave,
}: PrayerQuickSettingsSheetProps) {
  const { colors, scheme } = useTheme();
  const { language } = useLanguage();
  const [notify, setNotify] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!settings || !visible) return;
    setNotify(settings.prayerNotify[prayerName] ?? true);
    setOffset(settings.prayerOffsets[prayerName] ?? 0);
  }, [visible, settings, prayerName]);

  const handleSave = () => {
    hapticSelection();
    onSave({
      prayerNotify: { ...settings!.prayerNotify, [prayerName]: notify },
      prayerOffsets: { ...settings!.prayerOffsets, [prayerName]: offset },
    });
    onClose();
  };

  const label = getPrayerName(language, prayerName);
  const notifyLabel = getString(language, 'notifyForPrayer');
  const offsetLabel = getString(language, 'prayerOffset');
  const saveLabel = getString(language, 'save');
  const cancelLabel = getString(language, 'cancel');
  const onLabel = getString(language, 'on');
  const offLabel = getString(language, 'off');

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
        </View>
      </TouchableWithoutFeedback>
      <View style={styles.centre}>
        <TouchableWithoutFeedback>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{label}</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text }]}>{notifyLabel}</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  setNotify((v) => !v);
                }}
                style={[styles.toggle, { backgroundColor: notify ? colors.highlight : colors.border }]}
              >
                <Text style={[styles.toggleText, { color: notify ? '#fff' : colors.textMuted }]}>
                  {notify ? onLabel : offLabel}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text }]}>{offsetLabel}</Text>
              <View style={styles.offsetRow}>
                <TouchableOpacity
                  onPress={() => {
                    hapticSelection();
                    setOffset((o) => Math.max(OFFSET_MIN, o - 1));
                  }}
                  disabled={offset <= OFFSET_MIN}
                  style={[styles.offsetBtn, { backgroundColor: colors.highlight }, offset <= OFFSET_MIN && styles.offsetBtnDisabled]}
                >
                  <Text style={styles.offsetBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.offsetValue, { color: colors.text }]}>
                  {offset >= 0 ? `+${offset}` : offset} min
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    hapticSelection();
                    setOffset((o) => Math.min(OFFSET_MAX, o + 1));
                  }}
                  disabled={offset >= OFFSET_MAX}
                  style={[styles.offsetBtn, { backgroundColor: colors.highlight }, offset >= OFFSET_MAX && styles.offsetBtnDisabled]}
                >
                  <Text style={styles.offsetBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: colors.border }]}>
                <Text style={[styles.btnText, { color: colors.text }]}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.btn, { backgroundColor: colors.highlight }]}>
                <Text style={[styles.btnText, { color: '#fff' }]}>{saveLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: { fontSize: fontSize.md, flex: 1 },
  toggle: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  toggleText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  offsetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offsetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offsetBtnDisabled: { opacity: 0.4 },
  offsetBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  offsetValue: { fontSize: fontSize.sm, minWidth: 56, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  btn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
