/**
 * Asma ul Husna voice options (language-based).
 * IslamicAPI provides audio in 75 languages - different languages may have different voices.
 */
export type AsmaVoiceId = string;

export const ASMA_VOICES: { id: AsmaVoiceId; labelEn: string; labelAr: string }[] = [
  { id: 'ar', labelEn: 'Arabic', labelAr: 'العربية' },
  { id: 'en', labelEn: 'English', labelAr: 'English' },
  { id: 'ur', labelEn: 'Urdu', labelAr: 'أردو' },
  { id: 'tr', labelEn: 'Turkish', labelAr: 'تركية' },
  { id: 'id', labelEn: 'Indonesian', labelAr: 'إندونيسية' },
  { id: 'ms', labelEn: 'Malay', labelAr: 'ماليزية' },
  { id: 'sv', labelEn: 'Swedish', labelAr: 'سويدية' },
  { id: 'de', labelEn: 'German', labelAr: 'ألمانية' },
  { id: 'fr', labelEn: 'French', labelAr: 'فرنسية' },
];

export const DEFAULT_ASMA_VOICE: AsmaVoiceId = 'ar';
