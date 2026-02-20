/**
 * Quran reciters from Al-Quran Cloud CDN and EveryAyah.com.
 * Customer-requested: Mishary Alafasy, Al-Minshawi, Maher Al Muaiqly, Yasser Al Dossari.
 */
export const DEFAULT_RECITER = 'ar.alafasy';

export type ReciterSource = 'cdn' | 'everyayah';

export const QURAN_RECITERS = [
  { id: 'ar.alafasy', nameEn: 'Mishary Rashid Alafasy', nameAr: 'مشاري راشد العفاسي', source: 'cdn' as const },
  { id: 'ar.minshawi', nameEn: 'Mohamed Siddiq Al-Minshawi', nameAr: 'محمد صديق المنشاوي', source: 'cdn' as const },
  { id: 'ar.mahermuaiqly', nameEn: 'Maher Al Muaiqly', nameAr: 'ماهر المعيقلي', source: 'cdn' as const },
  { id: 'ar.husary', nameEn: 'Mahmoud Khalil Al-Husary', nameAr: 'محمد خليل الحصري', source: 'cdn' as const },
  {
    id: 'everyayah.yasseraldossari',
    nameEn: 'Yasser Al Dossari',
    nameAr: 'ياسر الدوسري',
    source: 'everyayah' as const,
    everyayahFolder: 'Yasser_Ad-Dussary_128kbps',
  },
] as const;

export type ReciterId = (typeof QURAN_RECITERS)[number]['id'];
export const RECITER_IDS = QURAN_RECITERS.map((r) => r.id) as readonly ReciterId[];

export function isReciterId(id: string): id is ReciterId {
  return RECITER_IDS.includes(id as ReciterId);
}

export function getDefaultReciter(): ReciterId {
  return isReciterId(DEFAULT_RECITER) ? (DEFAULT_RECITER as ReciterId) : 'ar.alafasy';
}

export function getReciterSource(id: ReciterId): ReciterSource {
  const r = QURAN_RECITERS.find((x) => x.id === id);
  return r?.source ?? 'cdn';
}

export function getEveryAyahFolder(id: ReciterId): string | null {
  const r = QURAN_RECITERS.find((x) => x.id === id);
  return r && 'everyayahFolder' in r ? (r as { everyayahFolder: string }).everyayahFolder : null;
}
