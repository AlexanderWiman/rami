/**
 * The reciters the app offers.
 *
 * Most now come from the Quran Foundation API through our backend, which is
 * where `apiId` points: their per-verse audio URLs are fetched rather than
 * built, so there is no URL pattern here to keep in step with a CDN.
 *
 * Two reciters have no `apiId` because the API does not carry them — Yasser Al
 * Dossari and Abdul Rahman Al-Ossi, both asked for by name. They keep their own
 * sources rather than being dropped from the list.
 *
 * `id` stays a stable slug, deliberately not the API's number: it is what the
 * chosen reciter is stored under and what names cached audio files on disk, so
 * keeping the old slugs means already-downloaded surahs stay valid.
 */
export const DEFAULT_RECITER = 'ar.alafasy';

export type ReciterSource = 'cdn' | 'everyayah' | 'mp3quran';

export const QURAN_RECITERS = [
  // --- carried over, so downloads and saved choices survive -----------------
  {
    id: 'ar.alafasy',
    apiId: 7,
    nameEn: 'Mishary Rashid Alafasy',
    nameAr: 'مشاري راشد العفاسي',
    source: 'everyayah' as const,
    everyayahFolder: 'Alafasy_128kbps',
  },
  {
    id: 'ar.minshawi',
    apiId: 9,
    nameEn: 'Mohamed Siddiq Al-Minshawi',
    nameAr: 'محمد صديق المنشاوي',
    source: 'everyayah' as const,
    everyayahFolder: 'Minshawy_Murattal_128kbps',
  },
  {
    id: 'ar.husary',
    apiId: 6,
    nameEn: 'Mahmoud Khalil Al-Husary',
    nameAr: 'محمود خليل الحصري',
    source: 'cdn' as const,
  },
  // --- not offered by the API; kept on their own sources --------------------
  {
    id: 'everyayah.yasseraldossari',
    apiId: null,
    nameEn: 'Yasser Al Dossari',
    nameAr: 'ياسر الدوسري',
    source: 'everyayah' as const,
    everyayahFolder: 'Yasser_Ad-Dussary_128kbps',
  },
  {
    id: 'mp3quran.abdurrahmanalossi',
    apiId: null,
    nameEn: 'Abdul Rahman Al-Ossi',
    nameAr: 'عبد الرحمن العوسي',
    source: 'mp3quran' as const,
    mp3quranServer: 'https://server6.mp3quran.net/aloosi/',
  },
  // --- new, from the API ----------------------------------------------------
  {
    id: 'qf.abdulbasit.mujawwad',
    apiId: 1,
    nameEn: 'AbdulBaset AbdulSamad (Mujawwad)',
    nameAr: 'عبد الباسط عبد الصمد (مجود)',
    source: 'cdn' as const,
  },
  {
    id: 'qf.abdulbasit.murattal',
    apiId: 2,
    nameEn: 'AbdulBaset AbdulSamad (Murattal)',
    nameAr: 'عبد الباسط عبد الصمد (مرتل)',
    source: 'cdn' as const,
  },
  {
    id: 'qf.sudais',
    apiId: 3,
    nameEn: 'Abdur-Rahman as-Sudais',
    nameAr: 'عبدالرحمن السديس',
    source: 'cdn' as const,
  },
  {
    id: 'qf.shatri',
    apiId: 4,
    nameEn: 'Abu Bakr al-Shatri',
    nameAr: 'أبو بكر الشاطرى',
    source: 'cdn' as const,
  },
  {
    id: 'qf.rifai',
    apiId: 5,
    nameEn: 'Hani ar-Rifai',
    nameAr: 'هاني الرفاعي',
    source: 'cdn' as const,
  },
  {
    id: 'qf.minshawi.mujawwad',
    apiId: 8,
    nameEn: 'Mohamed Siddiq al-Minshawi (Mujawwad)',
    nameAr: 'محمد صديق المنشاوي (مجود)',
    source: 'cdn' as const,
  },
  {
    id: 'qf.shuraym',
    apiId: 10,
    nameEn: "Sa`ud ash-Shuraym",
    nameAr: 'سعود الشريم',
    source: 'cdn' as const,
  },
  {
    id: 'qf.tablawi',
    apiId: 11,
    nameEn: 'Mohamed al-Tablawi',
    nameAr: 'محمد الطبلاوي',
    source: 'cdn' as const,
  },
  {
    id: 'qf.husary.muallim',
    apiId: 12,
    nameEn: 'Mahmoud Khalil Al-Husary (Muallim)',
    nameAr: 'محمود خليل الحصري (معلم)',
    source: 'cdn' as const,
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

/** The API's numeric id, or null for a reciter the API does not carry. */
export function getReciterApiId(id: string): number | null {
  const r = QURAN_RECITERS.find((x) => x.id === id);
  return r?.apiId ?? null;
}

export function getEveryAyahFolder(id: ReciterId): string | null {
  const r = QURAN_RECITERS.find((x) => x.id === id);
  return r && 'everyayahFolder' in r ? (r as { everyayahFolder: string }).everyayahFolder : null;
}

export function getMp3quranServer(id: ReciterId): string | null {
  const r = QURAN_RECITERS.find((x) => x.id === id);
  return r && 'mp3quranServer' in r ? (r as { mp3quranServer: string }).mp3quranServer : null;
}
