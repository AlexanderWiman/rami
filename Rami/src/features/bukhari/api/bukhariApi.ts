import type { BukhariContentLanguage, BukhariDataset, BukhariHadith } from '../types';
import { getBookChapterKey } from '../types';
import { getFallbackDataset } from '../data/fallbackDataset';

type RawHadith = {
  hadithnumber?: string | number;
  hadithNumber?: string | number;
  id?: string | number;
  text?: string;
  hadithArabic?: string;
  hadithEnglish?: string;
  chapterNumber?: string | number;
  chapter?: {
    chapterNumber?: string | number;
    chapterEnglish?: string;
    chapterArabic?: string;
    chapterTitle?: string;
  };
  bookNumber?: string | number;
  book?: {
    bookNumber?: string | number;
    bookName?: string;
    bookNameEnglish?: string;
    bookNameArabic?: string;
  };
};

type RawCollection = {
  metadata?: {
    name?: string;
    language?: string;
  };
  hadiths?: RawHadith[];
  data?: RawHadith[];
};

const API_BASE =
  process.env.EXPO_PUBLIC_HADITH_API_BASE ??
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

const EDITIONS: Record<BukhariContentLanguage, string[]> = {
  en: ['eng-bukhari', 'en-bukhari'],
  ar: ['ara-bukhari', 'ar-bukhari'],
};

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function firstPositiveNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = toNumber(value, -1);
    if (n > 0) return n;
  }
  return null;
}

function normalizeText(item: RawHadith, language: BukhariContentLanguage): string {
  const primary = language === 'ar' ? item.hadithArabic : item.hadithEnglish;
  const text = primary ?? item.text ?? item.hadithEnglish ?? item.hadithArabic ?? '';
  return String(text).trim();
}

function normalizeDataset(raw: RawCollection, language: BukhariContentLanguage): BukhariDataset {
  const source = Array.isArray(raw.hadiths) ? raw.hadiths : Array.isArray(raw.data) ? raw.data : [];
  if (source.length === 0) return getFallbackDataset(language);

  const hadithsByBookChapter: Record<string, BukhariHadith[]> = {};
  const chapterTitles = new Map<string, string>();
  const bookTitles = new Map<number, string>();

  source.forEach((item, index) => {
    const bookId = toNumber(item.book?.bookNumber ?? item.bookNumber, 1);
    const chapterId = toNumber(item.chapter?.chapterNumber ?? item.chapterNumber, 1);
    const chapterTitle =
      item.chapter?.chapterTitle ??
      (language === 'ar' ? item.chapter?.chapterArabic : item.chapter?.chapterEnglish) ??
      `Chapter ${chapterId}`;
    const bookTitle =
      (language === 'ar' ? item.book?.bookNameArabic : item.book?.bookNameEnglish) ??
      item.book?.bookName ??
      `Book ${bookId}`;
    const hadithNumber = firstPositiveNumber(item.hadithnumber, item.hadithNumber, item.id) ?? index + 1;
    const hadithId = `${bookId}-${chapterId}-${hadithNumber}-${index}`;
    const text = normalizeText(item, language);
    if (!text) return;

    const key = getBookChapterKey(bookId, chapterId);
    const collection = hadithsByBookChapter[key] ?? [];
    collection.push({
      id: hadithId,
      number: hadithNumber,
      bookId,
      chapterId,
      chapterTitle,
      text,
    });
    hadithsByBookChapter[key] = collection;
    chapterTitles.set(key, chapterTitle);
    if (!bookTitles.has(bookId)) bookTitles.set(bookId, bookTitle);
  });

  if (Object.keys(hadithsByBookChapter).length === 0) return getFallbackDataset(language);

  const chaptersByBook: BukhariDataset['chaptersByBook'] = {};
  Object.entries(hadithsByBookChapter).forEach(([key, items]) => {
    const [bookIdRaw, chapterIdRaw] = key.split(':');
    const bookId = Number.parseInt(bookIdRaw, 10);
    const chapterId = Number.parseInt(chapterIdRaw, 10);
    const list = chaptersByBook[bookId] ?? [];
    list.push({
      id: chapterId,
      title: chapterTitles.get(key) ?? `Chapter ${chapterId}`,
      hadithCount: items.length,
    });
    chaptersByBook[bookId] = list;
  });

  const books = Array.from(bookTitles.entries())
    .map(([id, title]) => {
      const chapters = chaptersByBook[id] ?? [];
      const hadithCount = chapters.reduce((sum, chapter) => sum + chapter.hadithCount, 0);
      return {
        id,
        title,
        chapterCount: chapters.length,
        hadithCount,
      };
    })
    .sort((a, b) => a.id - b.id);

  Object.keys(chaptersByBook).forEach((bookIdRaw) => {
    const bookId = Number.parseInt(bookIdRaw, 10);
    chaptersByBook[bookId] = (chaptersByBook[bookId] ?? []).sort((a, b) => a.id - b.id);
  });

  return {
    language,
    books,
    chaptersByBook,
    hadithsByBookChapter,
    updatedAt: Date.now(),
  };
}

async function fetchEdition(edition: string): Promise<RawCollection | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/${edition}.json`);
      if (!response.ok) continue;
      return (await response.json()) as RawCollection;
    } catch {
      /* retry */
    }
  }
  return null;
}

export async function fetchBukhariDataset(language: BukhariContentLanguage): Promise<BukhariDataset> {
  const candidates = EDITIONS[language];
  for (const edition of candidates) {
    const json = await fetchEdition(edition);
    if (json) {
      const normalized = normalizeDataset(json, language);
      if (normalized.books.length > 0) return normalized;
    }
  }
  return getFallbackDataset(language);
}
