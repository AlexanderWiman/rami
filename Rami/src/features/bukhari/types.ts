import type { Language } from '../prayer/types';

export type BukhariContentLanguage = 'en' | 'ar';

export type BukhariBook = {
  id: number;
  title: string;
  chapterCount: number;
  hadithCount: number;
};

export type BukhariChapter = {
  id: number;
  title: string;
  hadithCount: number;
};

export type BukhariHadith = {
  id: string;
  number: number;
  bookId: number;
  chapterId: number;
  chapterTitle: string;
  text: string;
};

export type BukhariDataset = {
  language: BukhariContentLanguage;
  books: BukhariBook[];
  chaptersByBook: Record<number, BukhariChapter[]>;
  hadithsByBookChapter: Record<string, BukhariHadith[]>;
  updatedAt: number;
};

export type BukhariLastRead = {
  bookId: number;
  chapterId: number;
  hadithId: string;
  hadithNumber: number;
  timestamp: number;
};

export type BukhariBookmark = {
  bookId: number;
  chapterId: number;
  hadithId: string;
  hadithNumber: number;
  createdAt: number;
};

export function getBookChapterKey(bookId: number, chapterId: number): string {
  return `${bookId}:${chapterId}`;
}

export function getBukhariContentLanguage(lang: Language): BukhariContentLanguage {
  return lang === 'ar' ? 'ar' : 'en';
}
