import type { BukhariDataset, BukhariContentLanguage } from '../types';
import { getBookChapterKey } from '../types';

const now = Date.now();

export function getFallbackDataset(language: BukhariContentLanguage): BukhariDataset {
  const isArabic = language === 'ar';

  const books = [
    {
      id: 1,
      title: isArabic ? 'بدء الوحي' : 'Revelation',
      chapterCount: 1,
      hadithCount: 1,
    },
    {
      id: 2,
      title: isArabic ? 'الإيمان' : 'Faith',
      chapterCount: 1,
      hadithCount: 2,
    },
  ];

  const chaptersByBook = {
    1: [{ id: 1, title: isArabic ? 'كيف كان بدء الوحي' : 'How revelation began', hadithCount: 1 }],
    2: [{ id: 1, title: isArabic ? 'أمور الإيمان' : 'Matters of faith', hadithCount: 2 }],
  };

  const hadithsByBookChapter = {
    [getBookChapterKey(1, 1)]: [
      {
        id: '1-1-1',
        number: 1,
        bookId: 1,
        chapterId: 1,
        chapterTitle: chaptersByBook[1][0].title,
        text: isArabic
          ? 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.'
          : 'Actions are judged by intentions, and every person will have only what they intended.',
      },
    ],
    [getBookChapterKey(2, 1)]: [
      {
        id: '2-1-1',
        number: 8,
        bookId: 2,
        chapterId: 1,
        chapterTitle: chaptersByBook[2][0].title,
        text: isArabic
          ? 'الإِيمَانُ بِضْعٌ وَسَبْعُونَ شُعْبَةً.'
          : 'Faith has over seventy branches.',
      },
      {
        id: '2-1-2',
        number: 9,
        bookId: 2,
        chapterId: 1,
        chapterTitle: chaptersByBook[2][0].title,
        text: isArabic
          ? 'الْحَيَاءُ شُعْبَةٌ مِنَ الإِيمَانِ.'
          : 'Modesty is a branch of faith.',
      },
    ],
  };

  return {
    language,
    books,
    chaptersByBook,
    hadithsByBookChapter,
    updatedAt: now,
  };
}
