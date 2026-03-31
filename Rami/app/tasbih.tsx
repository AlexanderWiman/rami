/**
 * Tasbih helper — simple counter with dhikr presets and custom dhikr.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ScreenWrapper } from '../src/components/ScreenWrapper';
import { BackToHomeBar } from '../src/components/BackToHomeBar';
import { GlassCard } from '../src/components/GlassCard';
import { getString, formatNumber } from '../src/constants/i18n';
import { hapticLight, hapticSuccess } from '../src/utils/haptics';
import { spacing, radius } from '../src/theme/spacing';
import { fontSize, fontWeight, fontFamily, lineHeight } from '../src/theme/typography';
import type { BuiltInPresetId } from '../src/features/tasbih/types';
import type { CustomDhikrItem, TasbihSettings } from '../src/features/tasbih/types';
import {
  loadTasbihSettings,
  addCustomDhikr,
  removeCustomDhikr,
  setPresetTargetOverride,
} from '../src/features/tasbih/storage/tasbihSettings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DHIKR_PRESETS: { id: BuiltInPresetId; i18nKey: 'tasbihPresetSubhanallah' | 'tasbihPresetAlhamdulillah' | 'tasbihPresetAllahuakbar' | 'tasbihPresetAstaghfirallah' | 'tasbihPresetLahawla' | 'tasbihPresetTahlil' | 'tasbihPresetSalawat'; target: number }[] = [
  { id: 'subhanallah', i18nKey: 'tasbihPresetSubhanallah', target: 33 },
  { id: 'alhamdulillah', i18nKey: 'tasbihPresetAlhamdulillah', target: 33 },
  { id: 'allahuakbar', i18nKey: 'tasbihPresetAllahuakbar', target: 34 },
  { id: 'astaghfirallah', i18nKey: 'tasbihPresetAstaghfirallah', target: 100 },
  { id: 'lahawla', i18nKey: 'tasbihPresetLahawla', target: 33 },
  { id: 'tahlil', i18nKey: 'tasbihPresetTahlil', target: 100 },
  { id: 'salawat', i18nKey: 'tasbihPresetSalawat', target: 100 },
];

export interface DhikrListItem {
  id: string;
  label: string;
  labelAr?: string;
  target: number;
  isCustom: boolean;
  presetId?: BuiltInPresetId;
}

function buildAllItems(settings: TasbihSettings | null, language: string): DhikrListItem[] {
  const overrides = settings?.presetTargetOverrides ?? {};
  const presets: DhikrListItem[] = DHIKR_PRESETS.map((p) => ({
    id: p.id,
    label: '', // filled by caller with getString
    target: (overrides[p.id] ?? p.target) as number,
    isCustom: false,
    presetId: p.id,
  }));
  const custom: DhikrListItem[] = (settings?.customDhikr ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    labelAr: c.labelAr,
    target: c.target,
    isCustom: true,
  }));
  return [...presets, ...custom];
}

export default function TasbihScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const modalPadBottom = spacing.xxl + spacing.xl + Math.max(insets.bottom, spacing.md);
  const title = getString(language, 'tasbihTitle');
  const subtitle = getString(language, 'tasbihSubtitle');
  const tapToCount = getString(language, 'tasbihTapToCount');
  const countLabel = getString(language, 'tasbihCount');
  const targetLabel = getString(language, 'tasbihTarget');
  const resetLabel = getString(language, 'tasbihReset');
  const presetsLabel = getString(language, 'tasbihPresets');
  const instruction = getString(language, 'tasbihInstruction');
  const reachedLabel = getString(language, 'tasbihReached');
  const addDhikrLabel = getString(language, 'tasbihAddDhikr');
  const customDhikrLabel = getString(language, 'tasbihCustomDhikr');
  const dhikrLabelHint = getString(language, 'tasbihDhikrLabel');
  const dhikrTargetHint = getString(language, 'tasbihDhikrTarget');
  const settingsLabel = getString(language, 'tasbihSettings');
  const saveLabel = getString(language, 'save');
  const cancelLabel = getString(language, 'cancel');
  const deleteLabel = getString(language, 'tasbihDelete');

  const cardText = isRoyal ? 'rgba(255,255,255,0.95)' : colors.text;
  const cardTextSecondary = isRoyal ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const cardTextMuted = isRoyal ? 'rgba(255,255,255,0.55)' : colors.textMuted;
  const goldAccent = '#E6C27A';
  const chipBg = isRoyal ? 'rgba(10, 25, 18, 0.5)' : undefined;
  const chipBorder = isRoyal ? 'rgba(255,255,255,0.15)' : 'transparent';
  const chipActiveBg = isRoyal ? 'rgba(230, 194, 122, 0.22)' : colors.highlightGlow;
  const chipActiveBorder = isRoyal ? 'rgba(230, 194, 122, 0.5)' : colors.highlight;
  const chipActiveText = isRoyal ? goldAccent : colors.highlight;

  const modalBg = isRoyal ? '#000000' : colors.surface;
  const modalText = isRoyal ? '#F9F1DD' : colors.textOnSurface;
  const modalTextMuted = isRoyal ? 'rgba(249, 241, 221, 0.55)' : colors.textOnSurfaceMuted;
  const modalBorder = isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.textOnSurfaceMuted;
  const modalInputBorder = isRoyal ? 'rgba(249, 241, 221, 0.22)' : colors.textOnSurfaceMuted;
  const modalSubtleBtnBg = isRoyal ? 'rgba(249, 241, 221, 0.14)' : colors.textOnSurfaceMuted;
  const modalTargetChipBg = isRoyal ? 'rgba(242, 210, 126, 0.16)' : colors.highlightGlow;

  const [settings, setSettings] = useState<TasbihSettings | null>(null);
  const [count, setCount] = useState(0);
  const [phraseId, setPhraseId] = useState<string>(DHIKR_PRESETS[0].id);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addLabelAr, setAddLabelAr] = useState('');
  const [addTarget, setAddTarget] = useState('33');
  const [editTargetPresetId, setEditTargetPresetId] = useState<string | null>(null);
  const [editTargetValue, setEditTargetValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTasbihSettings().then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const allItems = useMemo(() => buildAllItems(settings, language), [settings, language]);
  const allItemsWithLabels = useMemo(() => {
    return allItems.map((item) => {
      if (item.isCustom) {
        const label = language === 'ar' && item.labelAr ? item.labelAr : item.label;
        return { ...item, label, labelAr: item.labelAr };
      }
      const preset = DHIKR_PRESETS.find((p) => p.id === item.presetId);
      const label = preset ? getString(language, preset.i18nKey) : item.label;
      return { ...item, label };
    });
  }, [allItems, language]);

  const selectedItem = useMemo(
    () => allItemsWithLabels.find((x) => x.id === phraseId) ?? allItemsWithLabels[0],
    [allItemsWithLabels, phraseId]
  );
  const target = selectedItem?.target ?? 33;
  const phraseLabel = selectedItem ? (language === 'ar' && selectedItem.labelAr ? selectedItem.labelAr : selectedItem.label) : '';
  const reached = count >= target;

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      if (next === target) hapticSuccess();
      else hapticLight();
      return next;
    });
  }, [target]);

  const reset = useCallback(() => {
    hapticLight();
    setCount(0);
  }, []);

  const selectItem = useCallback((id: string) => {
    const item = allItemsWithLabels.find((x) => x.id === id);
    if (!item) return;
    hapticLight();
    setPhraseId(id);
    setCount(0);
  }, [allItemsWithLabels]);

  const setQuickTarget = useCallback((value: number) => {
    hapticLight();
    setCount(0);
    const next = allItemsWithLabels.find((x) => x.id === phraseId);
    if (next?.isCustom) return;
    setPresetTargetOverride(phraseId as BuiltInPresetId, value).then(setSettings);
  }, [phraseId, allItemsWithLabels]);

  const handleAddDhikr = useCallback(() => {
    const label = addLabel.trim();
    const targetNum = Math.max(1, Math.min(999, parseInt(addTarget, 10) || 33));
    if (!label) return;
    const item: CustomDhikrItem = {
      id: `custom-${Date.now()}`,
      label,
      labelAr: addLabelAr.trim() || undefined,
      target: targetNum,
    };
    addCustomDhikr(item).then((s) => {
      setSettings(s);
      setPhraseId(item.id);
      setCount(0);
      setAddLabel('');
      setAddLabelAr('');
      setAddTarget('33');
      setAddModalVisible(false);
    });
  }, [addLabel, addLabelAr, addTarget]);

  const handleDeleteCustom = useCallback((id: string) => {
    hapticLight();
    removeCustomDhikr(id).then((s) => {
      setSettings(s);
      if (phraseId === id) {
        setPhraseId(DHIKR_PRESETS[0].id);
        setCount(0);
      }
    });
  }, [phraseId]);

  const handleSavePresetTarget = useCallback((presetId: string, value: string) => {
    const num = Math.max(1, Math.min(999, parseInt(value, 10) || 33));
    setPresetTargetOverride(presetId, num).then((s) => {
      setSettings(s);
      if (phraseId === presetId) setCount(0);
      setEditTargetPresetId(null);
      setEditTargetValue('');
    });
  }, [phraseId]);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <BackToHomeBar />
            <TouchableOpacity
              onPress={() => setSettingsModalVisible(true)}
              style={[styles.settingsButton, { backgroundColor: chipBg, borderColor: chipBorder }]}
            >
              <Text style={[styles.settingsButtonText, { color: cardText }]}>{settingsLabel}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>

        <View style={styles.content}>
          <GlassCard padding="lg" rounded="lg" style={styles.counterCard}>
            <Text style={[styles.phrase, { color: cardText }, language === 'ar' && styles.phraseArabic]}>{phraseLabel}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={increment}
              style={[styles.counterButton, { borderColor: isRoyal ? 'rgba(255,255,255,0.15)' : colors.border }]}
            >
              <Text style={[styles.count, { color: isRoyal ? goldAccent : colors.highlight }]}>{formatNumber(language, count)}</Text>
              <Text style={[styles.tapHint, { color: cardTextMuted }]}>{tapToCount}</Text>
            </TouchableOpacity>
            <View style={styles.targetRow}>
              {reached ? (
                <Text style={[styles.reachedInline, { color: isRoyal ? goldAccent : colors.accent }]}>{reachedLabel}</Text>
              ) : (
                <Text style={[styles.targetText, { color: cardTextMuted }]}>
                  {countLabel}: {formatNumber(language, count)} · {targetLabel}: {formatNumber(language, target)}
                </Text>
              )}
              <TouchableOpacity onPress={reset} activeOpacity={0.7}>
                <Text style={[styles.resetText, { color: isRoyal ? goldAccent : colors.highlight }]}>{resetLabel}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <GlassCard padding="md" rounded="lg" style={styles.instructionCard}>
            <Text style={[styles.instructionText, { color: cardTextSecondary }]}>{instruction}</Text>
            <View style={styles.quickTargets}>
              {[33, 99].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setQuickTarget(value)}
                  style={[
                    styles.quickTarget,
                    { backgroundColor: chipBg, borderColor: chipBorder },
                    value === target && !selectedItem?.isCustom && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickTargetText, { color: value === target && !selectedItem?.isCustom ? chipActiveText : cardText }]}>{formatNumber(language, value)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          <View style={styles.presetHeader}>
            <Text style={[styles.sectionTitle, { color: cardTextMuted }]}>{presetsLabel}</Text>
            <TouchableOpacity
              onPress={() => setAddModalVisible(true)}
              style={[styles.addChipButton, { backgroundColor: chipBg, borderColor: chipBorder }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.addChipButtonText, { color: isRoyal ? goldAccent : colors.highlight }]}>+ {addDhikrLabel}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetRow}>
            {allItemsWithLabels.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => selectItem(item.id)}
                style={[
                  styles.presetChip,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  item.id === phraseId && { backgroundColor: chipActiveBg, borderColor: chipActiveBorder },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, { color: item.id === phraseId ? chipActiveText : cardText }, language === 'ar' && styles.presetTextArabic]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[styles.presetTarget, { color: item.id === phraseId ? chipActiveText : cardTextMuted }]}>· {formatNumber(language, item.target)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Dhikr settings modal */}
      <Modal transparent visible={settingsModalVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setSettingsModalVisible(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
        <View style={styles.modalCenter}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.modalBox,
              {
                backgroundColor: modalBg,
                borderColor: modalBorder,
                borderWidth: isRoyal ? StyleSheet.hairlineWidth : 0,
                paddingBottom: modalPadBottom,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: modalText }]}>{settingsLabel}</Text>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {DHIKR_PRESETS.map((preset) => (
                <View key={preset.id} style={styles.modalRow}>
                  <Text style={[styles.modalRowLabel, { color: modalText }]}>{getString(language, preset.i18nKey)}</Text>
                  {editTargetPresetId === preset.id ? (
                    <View style={styles.editTargetRow}>
                      <TextInput
                        style={[styles.editTargetInput, { color: modalText, borderColor: modalInputBorder }]}
                        value={editTargetValue}
                        onChangeText={setEditTargetValue}
                        keyboardType="number-pad"
                        placeholder="33"
                        placeholderTextColor={modalTextMuted}
                      />
                      <TouchableOpacity onPress={() => handleSavePresetTarget(preset.id, editTargetValue)} style={[styles.modalSmallBtn, { backgroundColor: colors.highlight }]}>
                        <Text style={[styles.modalSmallBtnText, { color: '#fff' }]}>{saveLabel}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setEditTargetPresetId(null); setEditTargetValue(''); }} style={[styles.modalSmallBtn, { backgroundColor: modalSubtleBtnBg }]}>
                        <Text style={[styles.modalSmallBtnText, { color: modalText }]}>{cancelLabel}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => { setEditTargetPresetId(preset.id); setEditTargetValue(String(settings?.presetTargetOverrides?.[preset.id] ?? preset.target)); }}
                      style={[styles.modalSmallBtn, { backgroundColor: modalTargetChipBg }]}
                    >
                      <Text style={[styles.modalSmallBtnText, { color: modalText }]}>{formatNumber(language, settings?.presetTargetOverrides?.[preset.id] ?? preset.target)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <Text style={[styles.modalSectionTitle, { color: modalTextMuted }]}>{customDhikrLabel}</Text>
              {(settings?.customDhikr ?? []).map((c) => (
                <View key={c.id} style={styles.modalRow}>
                  <Text style={[styles.modalRowLabel, { color: modalText }]} numberOfLines={1}>{language === 'ar' && c.labelAr ? c.labelAr : c.label}</Text>
                  <View style={styles.editTargetRow}>
                    <Text style={[styles.modalRowTarget, { color: modalTextMuted }]}>{formatNumber(language, c.target)}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCustom(c.id)} style={[styles.modalSmallBtn, { backgroundColor: '#c62828' }]}>
                      <Text style={[styles.modalSmallBtnText, { color: '#fff' }]}>{deleteLabel}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => { setSettingsModalVisible(false); setAddModalVisible(true); }}
                style={[styles.addDhikrButton, { backgroundColor: colors.highlight }]}
              >
                <Text style={[styles.addDhikrButtonText, { color: '#fff' }]}>{addDhikrLabel}</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={[styles.modalCloseBtn, { borderColor: modalInputBorder }]}>
              <Text style={[styles.modalCloseBtnText, { color: modalText }]}>{cancelLabel}</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add dhikr modal */}
      <Modal transparent visible={addModalVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setAddModalVisible(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
        <View style={styles.modalCenter}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.modalBox,
              {
                backgroundColor: modalBg,
                borderColor: modalBorder,
                borderWidth: isRoyal ? StyleSheet.hairlineWidth : 0,
                paddingBottom: modalPadBottom,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: modalText }]}>{addDhikrLabel}</Text>
            <Text style={[styles.inputLabel, { color: modalTextMuted }]}>{dhikrLabelHint}</Text>
            <TextInput
              style={[styles.input, { color: modalText, borderColor: modalInputBorder }]}
              value={addLabel}
              onChangeText={setAddLabel}
              placeholder="e.g. Subhan Allah"
              placeholderTextColor={modalTextMuted}
            />
            {language !== 'ar' && (
              <>
                <Text style={[styles.inputLabel, { color: modalTextMuted }]}>{dhikrLabelHint} (Arabic)</Text>
                <TextInput
                  style={[styles.input, { color: modalText, borderColor: modalInputBorder }]}
                  value={addLabelAr}
                  onChangeText={setAddLabelAr}
                  placeholder="e.g. سبحان الله"
                  placeholderTextColor={modalTextMuted}
                />
              </>
            )}
            <Text style={[styles.inputLabel, { color: modalTextMuted }]}>{dhikrTargetHint}</Text>
            <TextInput
              style={[styles.input, { color: modalText, borderColor: modalInputBorder }]}
              value={addTarget}
              onChangeText={setAddTarget}
              keyboardType="number-pad"
              placeholder="33"
              placeholderTextColor={modalTextMuted}
            />
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={[styles.modalCloseBtn, styles.addModalAction, { borderColor: modalInputBorder }]}
              >
                <Text style={[styles.modalCloseBtnText, { color: modalText }]}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddDhikr}
                style={[styles.addDhikrButton, styles.addModalAction, { backgroundColor: colors.highlight }]}
              >
                <Text style={[styles.addDhikrButtonText, { color: '#fff' }]}>{saveLabel}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.xxl + 72 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  settingsButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  settingsButtonText: { fontSize: fontSize.sm },
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
  content: { paddingHorizontal: spacing.lg },
  counterCard: { marginBottom: spacing.lg },
  phrase: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  phraseArabic: {
    textAlign: 'right',
    fontFamily: fontFamily.arabic,
  },
  counterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  count: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.heading,
  },
  tapHint: { marginTop: spacing.xs, fontSize: fontSize.xs },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetText: { fontSize: fontSize.sm, flex: 1 },
  resetText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  reachedInline: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flex: 1 },
  instructionCard: { marginBottom: spacing.lg },
  instructionText: { fontSize: fontSize.sm, lineHeight: fontSize.sm * lineHeight.relaxed },
  quickTargets: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickTarget: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  quickTargetText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  presetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.sm },
  addChipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addChipButtonText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  presetText: { fontSize: fontSize.xs },
  presetTextArabic: { textAlign: 'right', fontFamily: fontFamily.arabic },
  presetTarget: { fontSize: fontSize.xs },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  modalScroll: { maxHeight: 320 },
  modalSectionTitle: { fontSize: fontSize.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalRowLabel: { flex: 1, fontSize: fontSize.sm },
  modalRowTarget: { fontSize: fontSize.sm, marginRight: spacing.sm },
  editTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editTargetInput: {
    width: 56,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
  },
  modalSmallBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  modalSmallBtnText: { fontSize: fontSize.xs },
  addDhikrButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  addDhikrButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  modalCloseBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: fontSize.sm },
  inputLabel: { fontSize: fontSize.sm, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  addModalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    width: '100%',
    alignSelf: 'stretch',
  },
  addModalAction: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
});
