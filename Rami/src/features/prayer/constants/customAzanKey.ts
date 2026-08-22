/**
 * Sound key stored in PrayerSettings.selectedSound when the user picked their
 * own adhan file.
 *
 * Deliberately its own module with no imports: settings and notification code
 * run during app startup and must not pull in the file picker, whose native
 * module throws on import when it is missing from the installed binary.
 */
export const CUSTOM_AZAN_KEY = 'custom';
