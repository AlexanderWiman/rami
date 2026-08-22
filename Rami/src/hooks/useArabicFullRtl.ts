import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { useLanguage } from '../contexts/LanguageContext';

function devicePrimaryLocaleIsArabic(): boolean {
  const primary = Localization.getLocales()[0];
  const code = primary?.languageCode?.toLowerCase() ?? '';
  if (code === 'ar') return true;
  const tag = primary?.languageTag?.toLowerCase() ?? '';
  return tag === 'ar' || tag.startsWith('ar-');
}

/** In-app Arabic and device UI language Arabic — use RTL reading layout. */
export function useArabicFullRtl(): boolean {
  const { language } = useLanguage();
  return language === 'ar' && devicePrimaryLocaleIsArabic();
}

/** For mirrored positions (arrows, pins): system RTL or Arabic+Arabic subtree. */
export function useLayoutRtl(): boolean {
  const arabicFullRtl = useArabicFullRtl();
  return I18nManager.isRTL || arabicFullRtl;
}
