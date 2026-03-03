/**
 * Quran recitation audio via Al-Quran Cloud CDN, EveryAyah.com, QuranicAudio.com, and mp3quran.net.
 * CDN: https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{globalAyah}.mp3
 * CDN full surah: https://cdn.islamic.network/quran/audio-surah/{bitrate}/{edition}/{surah}.mp3
 * EveryAyah: https://everyayah.com/data/{folder}/{surah}{ayah}.mp3 (verse-by-verse only)
 * QuranicAudio full surah: https://download.quranicaudio.com/quran/{folder}/{surah}.mp3
 * mp3quran full surah: https://serverX.mp3quran.net/{reciter}/{surah}.mp3 (full surah only)
 */
import { SURAH_LIST } from '../data/surahs';
import {
  getReciterSource,
  getEveryAyahFolder,
  getMp3quranServer,
  type ReciterId,
  isReciterId,
} from '../constants/reciters';
import { DEFAULT_RECITER } from '../constants/reciters';

const CDN_BASE = 'https://cdn.islamic.network/quran/audio';
const CDN_SURAH_BASE = 'https://cdn.islamic.network/quran/audio-surah';
const QURANICAUDIO_BASE = 'https://download.quranicaudio.com/quran';
const EVERYAYAH_BASE = 'https://everyayah.com/data';
const BITRATE = 128;

/** Full surah sources: CDN (preferred), QuranicAudio fallback, mp3quran. */
/** ar.husary + ar.minshawi: CDN returns 403 – use QuranicAudio as primary. */
const FULL_SURAH_SOURCES: Record<string, { cdn?: string; quranicaudio?: string; mp3quran?: boolean; preferQa?: boolean }> = {
  'ar.alafasy': { cdn: 'ar.alafasy', quranicaudio: 'mishaari_raashid_al_3afaasee' },
  'ar.minshawi': { cdn: 'ar.minshawi', quranicaudio: 'muhammad_siddeeq_al-minshaawee', preferQa: true },
  'ar.husary': { cdn: 'ar.husary', quranicaudio: 'mahmood_khaleel_al-husaree_iza3a', preferQa: true },
  'everyayah.yasseraldossari': { quranicaudio: 'yasser_ad-dussary' },
  'mp3quran.abdurrahmanalossi': { mp3quran: true },
};

/** Get global ayah number (1–6236) from surah and ayah-in-surah. */
export function getGlobalAyahNumber(surahNumber: number, ayahInSurah: number): number {
  const before = SURAH_LIST.filter((s) => s.number < surahNumber).reduce((sum, s) => sum + s.ayahCount, 0);
  return before + ayahInSurah;
}

/** URL for a single ayah. Uses CDN, EveryAyah, or mp3quran (full surah only – tap plays that surah). */
export function getAyahAudioUrl(
  surahNumber: number,
  ayahInSurah: number,
  reciterId: string = DEFAULT_RECITER,
  bitrate: number = BITRATE
): string {
  const id = isReciterId(reciterId) ? reciterId : (DEFAULT_RECITER as ReciterId);
  const source = getReciterSource(id);

  if (source === 'everyayah') {
    const folder = getEveryAyahFolder(id);
    if (!folder) return getAyahAudioUrl(surahNumber, ayahInSurah, DEFAULT_RECITER, bitrate);
    const surahPadded = String(surahNumber).padStart(3, '0');
    const ayahPadded = String(ayahInSurah).padStart(3, '0');
    return `${EVERYAYAH_BASE}/${folder}/${surahPadded}${ayahPadded}.mp3`;
  }

  if (source === 'mp3quran') {
    const server = getMp3quranServer(id);
    if (!server) return getAyahAudioUrl(surahNumber, ayahInSurah, DEFAULT_RECITER, bitrate);
    const surahPadded = String(surahNumber).padStart(3, '0');
    return `${server.replace(/\/$/, '')}/${surahPadded}.mp3`;
  }

  const global = getGlobalAyahNumber(surahNumber, ayahInSurah);
  return `${CDN_BASE}/${bitrate}/${id}/${global}.mp3`;
}

/** True if reciter has full surah audio (CDN or QuranicAudio). */
export function hasFullSurahReciter(reciterId: string): boolean {
  const id = isReciterId(reciterId) ? reciterId : (DEFAULT_RECITER as ReciterId);
  return id in FULL_SURAH_SOURCES;
}

/** Full surah audio. Returns [primary, fallback] – try primary first, fallback on error. */
export function getFullSurahAudioUrls(
  surahNumber: number,
  reciterId: string = DEFAULT_RECITER,
  bitrate: number = BITRATE
): [string, string | null] | null {
  const id = isReciterId(reciterId) ? reciterId : (DEFAULT_RECITER as ReciterId);
  const sources = FULL_SURAH_SOURCES[id];
  if (!sources) return null;
  const surahPadded = String(surahNumber).padStart(3, '0');

  if (sources.mp3quran) {
    const server = getMp3quranServer(id);
    if (!server) return null;
    return [`${server.replace(/\/$/, '')}/${surahPadded}.mp3`, null];
  }

  const cdnUrl = sources.cdn
    ? `${CDN_SURAH_BASE}/${bitrate}/${sources.cdn}/${surahNumber}.mp3`
    : null;
  const qaUrl = sources.quranicaudio
    ? `${QURANICAUDIO_BASE}/${sources.quranicaudio}/${surahPadded}.mp3`
    : null;
  const preferQa = 'preferQa' in sources && sources.preferQa;
  if (cdnUrl && qaUrl) return preferQa ? [qaUrl, cdnUrl] : [cdnUrl, qaUrl];
  if (cdnUrl) return [cdnUrl, null];
  if (qaUrl) return [qaUrl, null];
  return null;
}

/** Full surah audio – primary URL (CDN preferred). */
export function getFullSurahAudioUrl(
  surahNumber: number,
  reciterId: string = DEFAULT_RECITER,
  bitrate: number = BITRATE
): string | null {
  const urls = getFullSurahAudioUrls(surahNumber, reciterId, bitrate);
  return urls ? urls[0] : null;
}
