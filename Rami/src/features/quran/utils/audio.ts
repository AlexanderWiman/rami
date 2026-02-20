/**
 * Quran recitation audio via Al-Quran Cloud CDN and EveryAyah.com.
 * CDN: https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{globalAyah}.mp3
 * EveryAyah: https://everyayah.com/data/{folder}/{surah}{ayah}.mp3 (e.g. 001001, 002015)
 */
import { SURAH_LIST } from '../data/surahs';
import {
  getReciterSource,
  getEveryAyahFolder,
  type ReciterId,
  isReciterId,
} from '../constants/reciters';
import { DEFAULT_RECITER } from '../constants/reciters';

const CDN_BASE = 'https://cdn.islamic.network/quran/audio';
const EVERYAYAH_BASE = 'https://everyayah.com/data';
const BITRATE = 128;

/** Get global ayah number (1–6236) from surah and ayah-in-surah. */
export function getGlobalAyahNumber(surahNumber: number, ayahInSurah: number): number {
  const before = SURAH_LIST.filter((s) => s.number < surahNumber).reduce((sum, s) => sum + s.ayahCount, 0);
  return before + ayahInSurah;
}

/** URL for a single ayah. Uses CDN for cdn reciters, EveryAyah for everyayah reciters. */
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

  const global = getGlobalAyahNumber(surahNumber, ayahInSurah);
  return `${CDN_BASE}/${bitrate}/${id}/${global}.mp3`;
}

/** Full surah disabled – caused issues for Alafasy. All reciters use verse-by-verse. */
export function getFullSurahAudioUrl(
  _surahNumber: number,
  _reciterId: string = DEFAULT_RECITER
): string | null {
  return null;
}
