/**
 * One printed mushaf page, rendered with that page's own QCF font.
 *
 * A line is a single Text: the QCF glyphs already carry the printed spacing, so
 * concatenating them reproduces the line exactly, and words of the same verse
 * become one nested Text — which is what lets the recited verse be highlighted
 * as one continuous block rather than per word.
 *
 * Each line must occupy exactly one rendered line. `adjustsFontSizeToFit` is
 * iOS-only, so the fit is measured instead: a line that wraps reports more than
 * one rendered line via onTextLayout and is scaled down until it fits. The
 * resulting scale is cached per page/line/size, so revisiting a page is stable
 * and jump-free.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type TextLayoutEventData,
  type NativeSyntheticEvent,
} from 'react-native';
import { SURAH_LIST } from '../data/surahs';
import { getString } from '../../../constants/i18n';
import type { Language } from '../../prayer/types';
import { getPageFontFamily } from '../utils/qcfFont';
import type { MushafLine, MushafPageData, MushafWord } from '../api/mushafPage';
import type { QuranPageStyle } from '../storage/quranStorage';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize as fontSizeTokens } from '../../../theme/typography';

const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const AMIRI = 'Amiri_400Regular';
/** Page width divided by this gives the base glyph size; lines shrink to fit. */
const LINE_SIZE_DIVISOR = 13.5;

export interface MushafPageTheme {
  pageBg: string;
  text: string;
  ornament: string;
  /** Background behind the verse being recited, kept for the style swatches */
  highlight: string;
  /** Colour the verse being recited takes; the script changes colour rather
   *  than sitting in a box, which is what was asked for. */
  activeText: string;
  /** Border of the surah-name banner */
  banner: string;
  bannerBg: string;
  /** Ruled line under each line of script, as in the verse reader. */
  lineRule: string;
  /** Faint second line just beneath, which is what gives the rule its depth. */
  lineRuleShadow: string;
  /** Wash laid over the parchment; transparent leaves the texture as printed. */
  pageOverlay: string;
}

export function getMushafTheme(style: QuranPageStyle): MushafPageTheme {
  switch (style) {
    case 'night':
      return {
        pageBg: '#12140F',
        text: 'rgba(240,240,235,0.94)',
        ornament: '#C8B078',
        highlight: 'rgba(31,111,84,0.75)',
        activeText: '#8FE0B4',
        banner: 'rgba(240,240,235,0.35)',
        bannerBg: 'rgba(255,255,255,0.04)',
        lineRule: 'rgba(200,170,95,0.28)',
        lineRuleShadow: 'rgba(0,0,0,0.18)',
        pageOverlay: 'rgba(12,14,10,0.90)',
      };
    case 'royal':
      return {
        pageBg: '#0A1912',
        text: 'rgba(245,236,210,0.96)',
        ornament: '#E6C27A',
        highlight: 'rgba(214,179,106,0.30)',
        activeText: '#F0CE86',
        banner: 'rgba(230,194,122,0.55)',
        bannerBg: 'rgba(230,194,122,0.10)',
        lineRule: 'rgba(200,170,95,0.45)',
        lineRuleShadow: 'rgba(60,40,15,0.12)',
        pageOverlay: 'rgba(8,22,15,0.88)',
      };
    case 'paper':
    default:
      return {
        pageBg: '#F3E7D6',
        text: '#1A1A1A',
        ornament: '#7D5E0A',
        highlight: 'rgba(31,111,84,0.22)',
        activeText: '#0F6B4F',
        banner: 'rgba(125,94,10,0.45)',
        bannerBg: 'rgba(125,94,10,0.07)',
        lineRule: 'rgba(60,45,25,0.38)',
        lineRuleShadow: 'rgba(0,0,0,0.10)',
        pageOverlay: 'transparent',
      };
  }
}

/** Consecutive words of the same verse, so a highlight covers the whole verse. */
interface VerseRun {
  verseKey: string;
  glyphs: string;
}

function toVerseRuns(words: MushafWord[]): VerseRun[] {
  const runs: VerseRun[] = [];
  for (const word of words) {
    const last = runs[runs.length - 1];
    if (last && last.verseKey === word.verseKey) last.glyphs += word.glyph;
    else runs.push({ verseKey: word.verseKey, glyphs: word.glyph });
  }
  return runs;
}

/** Surah name in the reading language — Arabic script only when reading Arabic. */
function getSurahName(surah: number, language: Language): string {
  const meta = SURAH_LIST.find((s) => s.number === surah);
  if (!meta) return String(surah);
  return language === 'ar' ? meta.nameAr : meta.nameEn;
}

/**
 * Cached shrink factors, keyed page:line:size. Kept at module level so a page
 * that has already been measured renders at the right size immediately.
 */
const lineScaleCache = new Map<string, number>();

const MIN_LINE_SCALE = 0.6;
const SHRINK_STEP = 0.94;

function MushafLineText({
  runs,
  cacheKey,
  glyphSize,
  fontFamily,
  color,
  activeColor,
  activeVerseKey,
  onPressVerse,
}: {
  runs: VerseRun[];
  cacheKey: string;
  glyphSize: number;
  fontFamily: string;
  color: string;
  activeColor: string;
  activeVerseKey: string | null;
  onPressVerse?: (verseKey: string) => void;
}) {
  const [scale, setScale] = useState(() => lineScaleCache.get(cacheKey) ?? 1);
  const measuredRef = useRef(false);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const lineCount = event.nativeEvent.lines.length;
      if (lineCount <= 1) {
        // Fits — remember the scale that worked.
        if (!measuredRef.current) {
          measuredRef.current = true;
          lineScaleCache.set(cacheKey, scale);
        }
        return;
      }
      const next = scale * SHRINK_STEP;
      if (next < MIN_LINE_SCALE) {
        lineScaleCache.set(cacheKey, MIN_LINE_SCALE);
        setScale(MIN_LINE_SCALE);
        measuredRef.current = true;
        return;
      }
      lineScaleCache.set(cacheKey, next);
      setScale(next);
    },
    [cacheKey, scale]
  );

  const fontSize = Math.max(12, Math.round(glyphSize * scale));

  // The line stays tight around the glyphs with the mushaf's spacing carried by
  // a margin: 1.15 plus 0.55 is the 1.7 it replaces, and keeping the line box
  // close to the script leaves no room for it to drift within the row.
  return (
    <Text
      onTextLayout={handleTextLayout}
      style={[
        styles.line,
        {
          color,
          fontFamily,
          fontSize,
          lineHeight: Math.round(fontSize * 1.15),
        },
      ]}
      allowFontScaling={false}
    >
      {runs.map((run, index) => {
        const isActive = run.verseKey === activeVerseKey;
        return (
          <Text
            key={`${run.verseKey}-${index}`}
            onPress={onPressVerse ? () => onPressVerse(run.verseKey) : undefined}
            suppressHighlighting
            style={isActive ? { color: activeColor } : undefined}
          >
            {run.glyphs}
          </Text>
        );
      })}
    </Text>
  );
}

interface MushafPageProps {
  data: MushafPageData;
  /** Verse being recited, e.g. "2:255"; null when nothing is playing. */
  activeVerseKey: string | null;
  pageStyle: QuranPageStyle;
  /** Width available for a line of script */
  contentWidth: number;
  /** False until the page's QCF font is registered — falls back to Uthmani text. */
  fontReady: boolean;
  /** Reading language — decides the script of the surah-name banner. */
  language: Language;
  onPressVerse?: (verseKey: string) => void;
}

export function MushafPage({
  data,
  activeVerseKey,
  pageStyle,
  contentWidth,
  fontReady,
  language,
  onPressVerse,
}: MushafPageProps) {
  const theme = getMushafTheme(pageStyle);
  const glyphSize = Math.max(16, Math.round(contentWidth / LINE_SIZE_DIVISOR));
  const fontFamily = getPageFontFamily(data.page);

  const renderedLines = useMemo(
    () => data.lines.map((line) => ({ line, runs: line.kind === 'words' ? toVerseRuns(line.words) : [] })),
    [data.lines]
  );

  /** Without the page font the glyph codes are meaningless — show Uthmani text. */
  if (!fontReady) {
    return (
      <PageSurface>
        {data.verseKeys.map((verseKey) => {
          const isActive = verseKey === activeVerseKey;
          return (
            <Text
              key={verseKey}
              onPress={onPressVerse ? () => onPressVerse(verseKey) : undefined}
              style={[
                styles.fallbackVerse,
                { color: theme.text, fontFamily: AMIRI },
                isActive && { color: theme.activeText },
              ]}
            >
              {data.uthmani[verseKey] ?? ''}{' '}
              <Text style={{ color: theme.ornament }}>﴿{verseKey.split(':')[1]}﴾</Text>
            </Text>
          );
        })}
      </PageSurface>
    );
  }

  return (
    <PageSurface>
      {renderedLines.map(({ line, runs }) => {
        if (line.kind === 'surahName') {
          return (
            <View
              key={`s-${line.lineNumber}`}
              style={styles.banner}
            >
              <Text
                style={[
                  styles.bannerText,
                  { color: theme.ornament },
                  language === 'ar' ? { fontFamily: AMIRI } : styles.bannerTextLatin,
                ]}
              >
                {getString(language, 'surahLabel')} {getSurahName(line.surah, language)}
              </Text>
            </View>
          );
        }

        if (line.kind === 'basmala') {
          return (
            <Text
              key={`b-${line.lineNumber}`}
              style={[styles.basmala, { color: theme.text, fontFamily: AMIRI }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {BASMALA}
            </Text>
          );
        }

        if (line.kind === 'blank') {
          return <View key={`e-${line.lineNumber}`} style={{ height: glyphSize }} />;
        }

        return (
          <View
            key={`r-${data.page}-${line.lineNumber}`}
            style={{ marginBottom: Math.round(glyphSize * 0.55) }}
          >
          <MushafLineText
            // Page in the key so a reused panel remounts with a fresh measurement.
            key={`w-${data.page}-${line.lineNumber}-${glyphSize}`}
            cacheKey={`${data.page}:${line.lineNumber}:${glyphSize}`}
            runs={runs}
            glyphSize={glyphSize}
            fontFamily={fontFamily}
            color={theme.text}
            activeColor={theme.activeText}
            activeVerseKey={activeVerseKey}
            onPressVerse={onPressVerse}
          />
          <View style={[styles.rule, { backgroundColor: theme.lineRule }]} />
          <View style={[styles.rule, { backgroundColor: theme.lineRuleShadow }]} />
          </View>
        );
      })}
    </PageSurface>
  );
}

/**
 * The script sits on the parchment the screen paints behind the whole reading
 * area, so the page itself stays transparent — a card with its own background
 * is exactly what made the mushaf look unlike the verse reader.
 */
function PageSurface({ children }: { children: React.ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

/** Small tap target used by the page-style switcher. */
export function PageStyleSwatch({
  pageStyle,
  selected,
  onPress,
}: {
  pageStyle: QuranPageStyle;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = getMushafTheme(pageStyle);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.swatch,
        { backgroundColor: theme.pageBg, borderColor: selected ? theme.ornament : theme.banner },
        selected && styles.swatchSelected,
      ]}
    >
      <View style={[styles.swatchLine, { backgroundColor: theme.text }]} />
      <View style={[styles.swatchLine, styles.swatchLineShort, { backgroundColor: theme.highlight }]} />
      <View style={[styles.swatchLine, { backgroundColor: theme.text }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },

  rule: { height: 1 },
  line: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  banner: {
    paddingVertical: spacing.xxs,
    marginVertical: spacing.xs,
    alignItems: 'center',
  },
  bannerText: { fontSize: fontSizeTokens.lg, writingDirection: 'rtl' },
  bannerTextLatin: { writingDirection: 'ltr', fontWeight: '600' },
  basmala: {
    fontSize: fontSizeTokens.lg,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing.xs,
  },
  fallbackVerse: {
    fontSize: 22,
    lineHeight: 42,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.xs,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 6,
    justifyContent: 'space-between',
  },
  swatchSelected: { borderWidth: 2 },
  swatchLine: { height: 3, borderRadius: 2 },
  swatchLineShort: { width: '70%' },
});
