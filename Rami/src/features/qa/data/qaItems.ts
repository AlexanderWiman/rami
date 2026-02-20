/**
 * Static fallback items. Tag chips and search filter title + body + tags.
 * Sources shown at bottom of article view.
 */
import type { QAItem } from '../types';
import type { Language } from '../../prayer/types';

export const QA_ITEMS_EN: QAItem[] = [
  {
    id: '1',
    title: 'What are the five daily prayers?',
    body: 'The five daily prayers (Salat) are Fajr (dawn), Dhuhr (noon), Asr (afternoon), Maghrib (sunset), and Isha (night). They are obligatory for every adult Muslim.',
    tags: ['prayer', 'basics', 'obligation'],
    sources: ['Sahih Bukhari', 'Sahih Muslim'],
    language: 'en',
  },
  {
    id: '2',
    title: 'When is Fajr?',
    body: 'Fajr is the dawn prayer, performed after true dawn (when the white thread of light appears) and before sunrise. Calculation methods (e.g. MWL, Egypt) define the twilight angle used.',
    tags: ['fajr', 'timing', 'calculation'],
    sources: ['AlAdhan API', 'Islamic fiqh councils'],
    language: 'en',
  },
  {
    id: '3',
    title: 'What is Qibla?',
    body: 'Qibla is the direction Muslims face during prayer: toward the Kaaba in Mecca. The bearing (angle from North) depends on your location.',
    tags: ['qibla', 'prayer', 'direction'],
    sources: ['Quran 2:144', 'Hadith'],
    language: 'en',
  },
];

export const QA_ITEMS_AR: QAItem[] = [
  {
    id: '1-ar',
    title: 'ما هي الصلوات الخمس؟',
    body: 'الصلوات الخمس هي الفجر، والظهر، والعصر، والمغرب، والعشاء. وهي واجبة على كل مسلم بالغ.',
    tags: ['صلاة', 'أساسيات', 'فرض'],
    sources: ['صحيح البخاري', 'صحيح مسلم'],
    language: 'ar',
  },
];

export function getFallbackQAItems(lang: Language): QAItem[] {
  return lang === 'ar' ? QA_ITEMS_AR : QA_ITEMS_EN;
}

export function searchQAItems(items: QAItem[], query: string): QAItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.body.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function getAllTags(items: QAItem[]): string[] {
  const set = new Set<string>();
  items.forEach((i) => i.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}
