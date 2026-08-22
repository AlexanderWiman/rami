/**
 * Prayer feature types. Extended with calculation method, asr, high-latitude,
 * per-prayer offsets, per-prayer notify toggles. settingsVersion for migration.
 */
/** Prayer names as used by AlAdhan API and internally */
export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

/** Single prayer time for a day */
export interface PrayerTime {
  name: PrayerName;
  time: Date;
  /** ISO date string (YYYY-MM-DD) for cache key */
  dateKey: string;
}

/** All five daily prayer times for a date, plus sunrise (Shuruq) */
export interface PrayerTimesForDay {
  dateKey: string;
  times: PrayerTime[];
  /** Sunrise time (Shuruq) – not a prayer, marks end of Fajr window */
  sunrise?: Date | null;
}

/** Calculation method: AlAdhan API method id. */
export type CalculationMethodId = 1 | 3 | 4 | 5 | 13 | 19 | 21;
/** UI-facing calculation method key */
export type CalculationMethodKey = 'MWL' | 'Egypt' | 'UmmAlQura' | 'Karachi' | 'Diyanet' | 'Algeria' | 'Morocco';

/** Asr: Shafi (shadow = 1) or Hanafi (shadow = 2). AlAdhan school 0=Shafi, 1=Hanafi */
export type AsrMethodKey = 'Shafi' | 'Hanafi';

/** High latitude rule: AlAdhan latitudeAdjustmentMethod 1/2/3 */
export type HighLatitudeRuleKey = 'MiddleOfNight' | 'SeventhOfNight' | 'AngleBased';

/** Next prayer with countdown */
export interface NextPrayerResult {
  prayer: PrayerTime;
  /** Seconds until this prayer */
  secondsUntil: number;
}

/** Per-prayer offset in minutes, range -10 to +10 */
export type PrayerOffsetMinutes = Record<PrayerName, number>;

/** Per-prayer notification on/off */
export type PrayerNotifyFlags = Record<PrayerName, boolean>;

export type PrayerPresetSource = 'auto' | 'manual';

export interface PrayerSettings {
  /** Version for migrations; bump when shape changes */
  settingsVersion: number;
  notificationsEnabled: boolean;
  playAzanSound: boolean;
  /** Key of sound file: 'azan1' .. 'azan8' (Cloudinary) */
  selectedSound: string;
  respectSilentMode: boolean;
  /** Calculation method (MWL, Egypt, UmmAlQura, Karachi) */
  calculationMethod: CalculationMethodKey;
  /** Asr: Shafi or Hanafi */
  asrMethod: AsrMethodKey;
  /** High latitude rule */
  highLatitudeRule: HighLatitudeRuleKey;
  /** Whether calculation settings follow country presets or user overrides */
  presetSource: PrayerPresetSource;
  /** ISO country code used for the current automatic preset */
  presetCountryCode?: string | null;
  /** Minutes to add to each prayer time (-10 to +10) */
  prayerOffsets: PrayerOffsetMinutes;
  /** Notify for this prayer (only used when notificationsEnabled is true) */
  prayerNotify: PrayerNotifyFlags;
  /** Local hourly reminders, alternating alhamdulillah and salawat (requires notificationsEnabled) */
  alhamdulillahReminderEnabled: boolean;
}

/** Legacy type alias for API (numeric method id) */
export type CalculationMethod = CalculationMethodId;

export type Language = 'en' | 'ar' | 'tr' | 'fr' | 'es' | 'sv' | 'de';
