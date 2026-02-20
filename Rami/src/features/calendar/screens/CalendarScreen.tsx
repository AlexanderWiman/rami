/**
 * CalendarScreen — Islamic Calendar with Hijri/Gregorian dates.
 * Features: Today's date, upcoming events, date converter.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackToHomeBar } from '../../../components/BackToHomeBar';
import { GlassCard } from '../../../components/GlassCard';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getString } from '../../../constants/i18n';
import { fontSize, fontWeight } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import {
  getTodayHijriDate,
  gregorianToHijri,
  hijriToGregorian,
  getEventGregorianDate,
} from '../api/hijri';
import type { TodayDateInfo, HijriDate, GregorianDate, UpcomingEvent, IslamicEvent } from '../types';

// Islamic events with their Hijri dates
const ISLAMIC_EVENTS: IslamicEvent[] = [
  { key: 'islamicNewYear', hijriMonth: 1, hijriDay: 1 },
  { key: 'ashura', hijriMonth: 1, hijriDay: 10 },
  { key: 'mawlidNabi', hijriMonth: 3, hijriDay: 12 },
  { key: 'ramadanStart', hijriMonth: 9, hijriDay: 1 },
  { key: 'lailatAlQadr', hijriMonth: 9, hijriDay: 27 },
  { key: 'eidAlFitr', hijriMonth: 10, hijriDay: 1 },
  { key: 'dayOfArafah', hijriMonth: 12, hijriDay: 9 },
  { key: 'eidAlAdha', hijriMonth: 12, hijriDay: 10 },
];

const GOLD = '#E6C27A';
const GOLD_MUTED = 'rgba(230, 194, 122, 0.7)';

export function CalendarScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayInfo, setTodayInfo] = useState<TodayDateInfo | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  
  // Converter state
  const [converterMode, setConverterMode] = useState<'g2h' | 'h2g'>('g2h');
  const [inputDay, setInputDay] = useState(new Date().getDate());
  const [inputMonth, setInputMonth] = useState(new Date().getMonth() + 1);
  const [inputYear, setInputYear] = useState(new Date().getFullYear());
  const [conversionResult, setConversionResult] = useState<HijriDate | GregorianDate | null>(null);
  const [converting, setConverting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Get today's date
      const today = await getTodayHijriDate();
      setTodayInfo(today);

      // Get upcoming events
      if (today) {
        const events: UpcomingEvent[] = [];
        for (const event of ISLAMIC_EVENTS) {
          const result = await getEventGregorianDate(
            event.hijriMonth,
            event.hijriDay,
            today.hijri.year
          );
          if (result) {
            events.push({
              key: event.key,
              hijriDate: `${event.hijriDay} ${getHijriMonthName(event.hijriMonth, language)}`,
              gregorianDate: `${result.gregorian.day} ${result.gregorian.monthName} ${result.gregorian.year}`,
              daysLeft: result.daysLeft,
            });
          }
        }
        // Sort by days left
        events.sort((a, b) => a.daysLeft - b.daysLeft);
        setUpcomingEvents(events.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleConvert = useCallback(async () => {
    setConverting(true);
    try {
      if (converterMode === 'g2h') {
        const result = await gregorianToHijri(inputDay, inputMonth, inputYear);
        setConversionResult(result);
      } else {
        const result = await hijriToGregorian(inputDay, inputMonth, inputYear);
        setConversionResult(result);
      }
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setConverting(false);
    }
  }, [converterMode, inputDay, inputMonth, inputYear]);

  const getHijriMonthName = (month: number, lang: string): string => {
    const months = (getString as any)(lang, 'hijriMonths') as Record<number, string>;
    return months?.[month] || '';
  };

  const getEventName = (key: string, lang: string): string => {
    const events = (getString as any)(lang, 'islamicEvents') as Record<string, string>;
    return events?.[key] || key;
  };

  const formatDaysLeft = (days: number): string => {
    const template = getString(language, 'calendarDaysLeft');
    return template.replace('{days}', String(days));
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.homeBarWrapper}>
          <BackToHomeBar />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper edges={['top']}>
      <View style={styles.homeBarWrapper}>
        <BackToHomeBar />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleArabic}>التقويم</Text>
        </View>

        {/* Card 1: Today */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{getString(language, 'calendarToday')}</Text>
          
          {todayInfo && (
            <View style={styles.todayContent}>
              {/* Gregorian Date */}
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{getString(language, 'calendarGregorian')}</Text>
                <Text style={styles.dateValue}>
                  {todayInfo.gregorian.day} {todayInfo.gregorian.monthName} {todayInfo.gregorian.year}
                </Text>
              </View>
              
              {/* Hijri Date */}
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{getString(language, 'calendarHijri')}</Text>
                <Text style={styles.dateValue}>
                  {todayInfo.hijri.day} {getHijriMonthName(todayInfo.hijri.month, language)} {todayInfo.hijri.year}
                </Text>
              </View>
              
              {/* Hijri Year Prominent */}
              <View style={styles.hijriYearBadge}>
                <Text style={styles.hijriYearText}>{todayInfo.hijri.year} AH</Text>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Card 2: Upcoming Events */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{getString(language, 'calendarUpcoming')}</Text>
          
          {upcomingEvents.length > 0 ? (
            <View style={styles.eventsContainer}>
              {upcomingEvents.map((event, index) => (
                <View
                  key={event.key}
                  style={[
                    styles.eventRow,
                    index < upcomingEvents.length - 1 && styles.eventRowBorder,
                  ]}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{getEventName(event.key, language)}</Text>
                    <Text style={styles.eventDates}>
                      {event.hijriDate} • {event.gregorianDate}
                    </Text>
                  </View>
                  <View style={styles.daysLeftBadge}>
                    <Text style={styles.daysLeftText}>{formatDaysLeft(event.daysLeft)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noEventsText}>{getString(language, 'calendarLoading')}</Text>
          )}
        </GlassCard>

        {/* Card 3: Date Converter */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{getString(language, 'calendarConverter')}</Text>
          
          {/* Mode Toggle */}
          <View style={styles.toggleContainer}>
            <Pressable
              style={[styles.toggleButton, converterMode === 'g2h' && styles.toggleActive]}
              onPress={() => {
                setConverterMode('g2h');
                setConversionResult(null);
              }}
            >
              <Text style={[styles.toggleText, converterMode === 'g2h' && styles.toggleTextActive]}>
                {getString(language, 'calendarGregorianToHijri')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, converterMode === 'h2g' && styles.toggleActive]}
              onPress={() => {
                setConverterMode('h2g');
                setConversionResult(null);
              }}
            >
              <Text style={[styles.toggleText, converterMode === 'h2g' && styles.toggleTextActive]}>
                {getString(language, 'calendarHijriToGregorian')}
              </Text>
            </Pressable>
          </View>

          {/* Date Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{getString(language, 'calendarDay')}</Text>
              <View style={styles.inputWrapper}>
                <Pressable
                  style={styles.inputArrow}
                  onPress={() => setInputDay(Math.max(1, inputDay - 1))}
                >
                  <Text style={styles.inputArrowText}>−</Text>
                </Pressable>
                <Text style={styles.inputValue}>{inputDay}</Text>
                <Pressable
                  style={styles.inputArrow}
                  onPress={() => setInputDay(Math.min(30, inputDay + 1))}
                >
                  <Text style={styles.inputArrowText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{getString(language, 'calendarMonth')}</Text>
              <View style={styles.inputWrapper}>
                <Pressable
                  style={styles.inputArrow}
                  onPress={() => setInputMonth(Math.max(1, inputMonth - 1))}
                >
                  <Text style={styles.inputArrowText}>−</Text>
                </Pressable>
                <Text style={styles.inputValue}>{inputMonth}</Text>
                <Pressable
                  style={styles.inputArrow}
                  onPress={() => setInputMonth(Math.min(12, inputMonth + 1))}
                >
                  <Text style={styles.inputArrowText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{getString(language, 'calendarYear')}</Text>
              <View style={styles.inputWrapper}>
                <Pressable
                  style={styles.inputArrow}
                  onPress={() => setInputYear(inputYear - 1)}
                >
                  <Text style={styles.inputArrowText}>−</Text>
                </Pressable>
                <Text style={styles.inputValue}>{inputYear}</Text>
                <Pressable
                  style={styles.inputArrow}
                  onPress={() => setInputYear(inputYear + 1)}
                >
                  <Text style={styles.inputArrowText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Convert Button */}
          <Pressable
            style={styles.convertButton}
            onPress={handleConvert}
            disabled={converting}
          >
            {converting ? (
              <ActivityIndicator size="small" color="#0A1612" />
            ) : (
              <Text style={styles.convertButtonText}>{getString(language, 'calendarConvert')}</Text>
            )}
          </Pressable>

          {/* Conversion Result */}
          {conversionResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>{getString(language, 'calendarConvertedResult')}</Text>
              <Text style={styles.resultValue}>
                {converterMode === 'g2h'
                  ? `${(conversionResult as HijriDate).day} ${getHijriMonthName((conversionResult as HijriDate).month, language)} ${(conversionResult as HijriDate).year} AH`
                  : `${(conversionResult as GregorianDate).day} ${(conversionResult as GregorianDate).monthName} ${(conversionResult as GregorianDate).year}`}
              </Text>
            </View>
          )}
        </GlassCard>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  homeBarWrapper: {
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  titleArabic: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: GOLD,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: GOLD,
    marginBottom: spacing.md,
  },
  todayContent: {
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: GOLD_MUTED,
    fontWeight: fontWeight.medium,
  },
  dateValue: {
    fontSize: fontSize.md,
    color: '#FFFFFF',
    fontWeight: fontWeight.semibold,
  },
  hijriYearBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(230, 194, 122, 0.15)',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  hijriYearText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: GOLD,
  },
  eventsContainer: {
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  eventRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(230, 194, 122, 0.2)',
  },
  eventInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventDates: {
    fontSize: fontSize.xs,
    color: GOLD_MUTED,
  },
  daysLeftBadge: {
    backgroundColor: 'rgba(31, 111, 84, 0.3)',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  daysLeftText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: GOLD,
  },
  noEventsText: {
    fontSize: fontSize.sm,
    color: GOLD_MUTED,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(230, 194, 122, 0.2)',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: 'rgba(230, 194, 122, 0.15)',
    borderColor: GOLD,
  },
  toggleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: GOLD_MUTED,
  },
  toggleTextActive: {
    color: GOLD,
    fontWeight: fontWeight.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: fontSize.xs,
    color: GOLD_MUTED,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230, 194, 122, 0.2)',
    overflow: 'hidden',
  },
  inputArrow: {
    width: 32,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputArrowText: {
    fontSize: 18,
    color: GOLD,
    fontWeight: fontWeight.bold,
  },
  inputValue: {
    minWidth: 40,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  convertButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  convertButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#0A1612',
  },
  resultContainer: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(31, 111, 84, 0.2)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: fontSize.xs,
    color: GOLD_MUTED,
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: GOLD,
  },
  bottomPadding: {
    height: 40,
  },
});
