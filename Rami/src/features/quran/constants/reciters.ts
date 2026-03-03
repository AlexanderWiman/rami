/**
 * Quran reciters from Al-Quran Cloud CDN, EveryAyah.com, and mp3quran.net.
 * Customer-requested: Mishary Alafasy, Al-Minshawi, Yasser Al Dossari,
 * Abdullah Shaaban, Muhammad Dibirov, Abdul Rahman Al-Ossi.
 */
export const DEFAULT_RECITER = 'ar.alafasy';

export type ReciterSource = 'cdn' | 'everyayah' | 'mp3quran';

export const QURAN_RECITERS = [
  {
    id: 'ar.alafasy',
    nameEn: 'Mishary Rashid Alafasy',
    nameAr: 'مشاري راشد العفاسي',
    source: 'everyayah' as const,
    everyayahFolder: 'Alafasy_128kbps',
  },
  {
    id: 'ar.minshawi',
    nameEn: 'Mohamed Siddiq Al-Minshawi',
    nameAr: 'محمد صديق المنشاوي',
    source: 'everyayah' as const,
    everyayahFolder: 'Minshawy_Murattal_128kbps',
  },
  { id: 'ar.husary', nameEn: 'Mahmoud Khalil Al-Husary', nameAr: 'محمد خليل الحصري', source: 'cdn' as const },
  {
    id: 'everyayah.yasseraldossari',
    nameEn: 'Yasser Al Dossari',
    nameAr: 'ياسر الدوسري',
    source: 'everyayah' as const,
    everyayahFolder: 'Yasser_Ad-Dussary_128kbps',
  },
  {
    id: 'mp3quran.abdurrahmanalossi',
    nameEn: 'Abdul Rahman Al-Ossi',
    nameAr: 'عبد الرحمن العوسي',
    source: 'mp3quran' as const,
    mp3quranServer: 'https://server6.mp3quran.net/aloosi/',
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

export function getMp3quranServer(id: ReciterId): string | null {
  const r = QURAN_RECITERS.find((x) => x.id === id);
  return r && 'mp3quranServer' in r ? (r as { mp3quranServer: string }).mp3quranServer : null;
}
