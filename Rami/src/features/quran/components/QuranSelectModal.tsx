/**
 * Bottom-sheet list used by the mushaf for picking a surah or a reciter.
 *
 * Both pickers are the same shape — a long list where one row is current — so
 * they share this component rather than each screen growing its own modal.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

export interface SelectItem {
  key: string;
  label: string;
  /** Secondary line — verse count, reciter's Arabic name, and so on */
  sublabel?: string;
  /** Leading marker, e.g. the surah number */
  badge?: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: SelectItem[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function QuranSelectModal({
  visible,
  title,
  items,
  selectedKey,
  onSelect,
  onClose,
}: Props) {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const gold = isRoyal ? '#E6C27A' : colors.highlight;
  const panelBg = isRoyal ? '#0A1912' : colors.surface;
  const textPrimary = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const textMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow presses inside the panel so only the backdrop closes it. */}
        <Pressable style={[styles.panel, { backgroundColor: panelBg }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {items.map((item) => {
              const selected = item.key === selectedKey;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => onSelect(item.key)}
                  style={[
                    styles.row,
                    { borderColor: colors.border },
                    selected && { backgroundColor: isRoyal ? 'rgba(230,194,122,0.12)' : colors.surfaceGlass },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  {item.badge ? (
                    <View style={[styles.badge, { borderColor: gold }]}>
                      <Text style={[styles.badgeText, { color: gold }]}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowLabel, { color: textPrimary }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.sublabel ? (
                      <Text style={[styles.rowSub, { color: textMuted }]} numberOfLines={1}>
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? <Ionicons name="checkmark" size={20} color={gold} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  panel: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontFamily: fontFamily.heading },
  closeButton: { padding: spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: fontSize.md },
  rowSub: { fontSize: fontSize.xs, marginTop: 1 },
});
