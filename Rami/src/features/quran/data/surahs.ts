import type { Language } from '../../prayer/types';

/**
 * Minimal surah metadata (number, nameEn, nameAr, ayahCount) for list and search.
 * Search supports surah number, surah name (en/ar), ayah number. Fallback text match
 * in translation would require verse content — add when needed.
 */
export interface SurahMeta {
  number: number;
  nameEn: string;
  nameAr: string;
  ayahCount: number;
}

export const SURAH_LIST: SurahMeta[] = [
  { number: 1, nameEn: 'Al-Fatihah', nameAr: 'الفاتحة', ayahCount: 7 },
  { number: 2, nameEn: 'Al-Baqarah', nameAr: 'البقرة', ayahCount: 286 },
  { number: 3, nameEn: "Ali 'Imran", nameAr: 'آل عمران', ayahCount: 200 },
  { number: 4, nameEn: 'An-Nisa', nameAr: 'النساء', ayahCount: 176 },
  { number: 5, nameEn: "Al-Ma'idah", nameAr: 'المائدة', ayahCount: 120 },
  { number: 6, nameEn: "Al-An'am", nameAr: 'الأنعام', ayahCount: 165 },
  { number: 7, nameEn: "Al-A'raf", nameAr: 'الأعراف', ayahCount: 206 },
  { number: 8, nameEn: 'Al-Anfal', nameAr: 'الأنفال', ayahCount: 75 },
  { number: 9, nameEn: 'At-Tawbah', nameAr: 'التوبة', ayahCount: 129 },
  { number: 10, nameEn: 'Yunus', nameAr: 'يونس', ayahCount: 109 },
  { number: 11, nameEn: 'Hud', nameAr: 'هود', ayahCount: 123 },
  { number: 12, nameEn: 'Yusuf', nameAr: 'يوسف', ayahCount: 111 },
  { number: 13, nameEn: "Ar-Ra'd", nameAr: 'الرعد', ayahCount: 43 },
  { number: 14, nameEn: 'Ibrahim', nameAr: 'إبراهيم', ayahCount: 52 },
  { number: 15, nameEn: 'Al-Hijr', nameAr: 'الحجر', ayahCount: 99 },
  { number: 16, nameEn: 'An-Nahl', nameAr: 'النحل', ayahCount: 128 },
  { number: 17, nameEn: 'Al-Isra', nameAr: 'الإسراء', ayahCount: 111 },
  { number: 18, nameEn: 'Al-Kahf', nameAr: 'الكهف', ayahCount: 110 },
  { number: 19, nameEn: 'Maryam', nameAr: 'مريم', ayahCount: 98 },
  { number: 20, nameEn: 'Taha', nameAr: 'طه', ayahCount: 135 },
  { number: 21, nameEn: 'Al-Anbiya', nameAr: 'الأنبياء', ayahCount: 112 },
  { number: 22, nameEn: 'Al-Hajj', nameAr: 'الحج', ayahCount: 78 },
  { number: 23, nameEn: 'Al-Mu\'minun', nameAr: 'المؤمنون', ayahCount: 118 },
  { number: 24, nameEn: 'An-Nur', nameAr: 'النور', ayahCount: 64 },
  { number: 25, nameEn: 'Al-Furqan', nameAr: 'الفرقان', ayahCount: 77 },
  { number: 26, nameEn: 'Ash-Shu\'ara', nameAr: 'الشعراء', ayahCount: 227 },
  { number: 27, nameEn: 'An-Naml', nameAr: 'النمل', ayahCount: 93 },
  { number: 28, nameEn: 'Al-Qasas', nameAr: 'القصص', ayahCount: 88 },
  { number: 29, nameEn: "Al-'Ankabut", nameAr: 'العنكبوت', ayahCount: 69 },
  { number: 30, nameEn: 'Ar-Rum', nameAr: 'الروم', ayahCount: 60 },
  { number: 31, nameEn: 'Luqman', nameAr: 'لقمان', ayahCount: 34 },
  { number: 32, nameEn: 'As-Sajdah', nameAr: 'السجدة', ayahCount: 30 },
  { number: 33, nameEn: 'Al-Ahzab', nameAr: 'الأحزاب', ayahCount: 73 },
  { number: 34, nameEn: 'Saba', nameAr: 'سبأ', ayahCount: 54 },
  { number: 35, nameEn: 'Fatir', nameAr: 'فاطر', ayahCount: 45 },
  { number: 36, nameEn: 'Ya-Sin', nameAr: 'يس', ayahCount: 83 },
  { number: 37, nameEn: 'As-Saffat', nameAr: 'الصافات', ayahCount: 182 },
  { number: 38, nameEn: 'Sad', nameAr: 'ص', ayahCount: 88 },
  { number: 39, nameEn: 'Az-Zumar', nameAr: 'الزمر', ayahCount: 75 },
  { number: 40, nameEn: 'Ghafir', nameAr: 'غافر', ayahCount: 85 },
  { number: 41, nameEn: 'Fussilat', nameAr: 'فصلت', ayahCount: 54 },
  { number: 42, nameEn: 'Ash-Shura', nameAr: 'الشورى', ayahCount: 53 },
  { number: 43, nameEn: 'Az-Zukhruf', nameAr: 'الزخرف', ayahCount: 89 },
  { number: 44, nameEn: 'Ad-Dukhan', nameAr: 'الدخان', ayahCount: 59 },
  { number: 45, nameEn: 'Al-Jathiyah', nameAr: 'الجاثية', ayahCount: 37 },
  { number: 46, nameEn: 'Al-Ahqaf', nameAr: 'الأحقاف', ayahCount: 35 },
  { number: 47, nameEn: 'Muhammad', nameAr: 'محمد', ayahCount: 38 },
  { number: 48, nameEn: 'Al-Fath', nameAr: 'الفتح', ayahCount: 29 },
  { number: 49, nameEn: 'Al-Hujurat', nameAr: 'الحجرات', ayahCount: 18 },
  { number: 50, nameEn: 'Qaf', nameAr: 'ق', ayahCount: 45 },
  { number: 51, nameEn: 'Adh-Dhariyat', nameAr: 'الذاريات', ayahCount: 60 },
  { number: 52, nameEn: 'At-Tur', nameAr: 'الطور', ayahCount: 49 },
  { number: 53, nameEn: 'An-Najm', nameAr: 'النجم', ayahCount: 62 },
  { number: 54, nameEn: 'Al-Qamar', nameAr: 'القمر', ayahCount: 55 },
  { number: 55, nameEn: 'Ar-Rahman', nameAr: 'الرحمن', ayahCount: 78 },
  { number: 56, nameEn: "Al-Waqi'ah", nameAr: 'الواقعة', ayahCount: 96 },
  { number: 57, nameEn: 'Al-Hadid', nameAr: 'الحديد', ayahCount: 29 },
  { number: 58, nameEn: 'Al-Mujadilah', nameAr: 'المجادلة', ayahCount: 22 },
  { number: 59, nameEn: 'Al-Hashr', nameAr: 'الحشر', ayahCount: 24 },
  { number: 60, nameEn: 'Al-Mumtahanah', nameAr: 'الممتحنة', ayahCount: 13 },
  { number: 61, nameEn: 'As-Saff', nameAr: 'الصف', ayahCount: 14 },
  { number: 62, nameEn: 'Al-Jumu\'ah', nameAr: 'الجمعة', ayahCount: 11 },
  { number: 63, nameEn: 'Al-Munafiqun', nameAr: 'المنافقون', ayahCount: 11 },
  { number: 64, nameEn: 'At-Taghabun', nameAr: 'التغابن', ayahCount: 18 },
  { number: 65, nameEn: 'At-Talaq', nameAr: 'الطلاق', ayahCount: 12 },
  { number: 66, nameEn: 'At-Tahrim', nameAr: 'التحريم', ayahCount: 12 },
  { number: 67, nameEn: 'Al-Mulk', nameAr: 'الملك', ayahCount: 30 },
  { number: 68, nameEn: 'Al-Qalam', nameAr: 'القلم', ayahCount: 52 },
  { number: 69, nameEn: 'Al-Haqqah', nameAr: 'الحاقة', ayahCount: 52 },
  { number: 70, nameEn: 'Al-Ma\'arij', nameAr: 'المعارج', ayahCount: 44 },
  { number: 71, nameEn: 'Nuh', nameAr: 'نوح', ayahCount: 28 },
  { number: 72, nameEn: 'Al-Jinn', nameAr: 'الجن', ayahCount: 28 },
  { number: 73, nameEn: 'Al-Muzzammil', nameAr: 'المزمل', ayahCount: 20 },
  { number: 74, nameEn: 'Al-Muddathir', nameAr: 'المدثر', ayahCount: 56 },
  { number: 75, nameEn: 'Al-Qiyamah', nameAr: 'القيامة', ayahCount: 40 },
  { number: 76, nameEn: 'Al-Insan', nameAr: 'الإنسان', ayahCount: 31 },
  { number: 77, nameEn: 'Al-Mursalat', nameAr: 'المرسلات', ayahCount: 50 },
  { number: 78, nameEn: "An-Naba'", nameAr: 'النبأ', ayahCount: 40 },
  { number: 79, nameEn: "An-Nazi'at", nameAr: 'النازعات', ayahCount: 46 },
  { number: 80, nameEn: "'Abasa", nameAr: 'عبس', ayahCount: 42 },
  { number: 81, nameEn: 'At-Takwir', nameAr: 'التكوير', ayahCount: 29 },
  { number: 82, nameEn: 'Al-Infitar', nameAr: 'الانفطار', ayahCount: 19 },
  { number: 83, nameEn: 'Al-Mutaffifin', nameAr: 'المطففين', ayahCount: 36 },
  { number: 84, nameEn: 'Al-Inshiqaq', nameAr: 'الانشقاق', ayahCount: 25 },
  { number: 85, nameEn: 'Al-Buruj', nameAr: 'البروج', ayahCount: 22 },
  { number: 86, nameEn: 'At-Tariq', nameAr: 'الطارق', ayahCount: 17 },
  { number: 87, nameEn: "Al-A'la", nameAr: 'الأعلى', ayahCount: 19 },
  { number: 88, nameEn: 'Al-Ghashiyah', nameAr: 'الغاشية', ayahCount: 26 },
  { number: 89, nameEn: 'Al-Fajr', nameAr: 'الفجر', ayahCount: 30 },
  { number: 90, nameEn: 'Al-Balad', nameAr: 'البلد', ayahCount: 20 },
  { number: 91, nameEn: 'Ash-Shams', nameAr: 'الشمس', ayahCount: 15 },
  { number: 92, nameEn: 'Al-Lail', nameAr: 'الليل', ayahCount: 21 },
  { number: 93, nameEn: 'Ad-Duha', nameAr: 'الضحى', ayahCount: 11 },
  { number: 94, nameEn: 'Ash-Sharh', nameAr: 'الشرح', ayahCount: 8 },
  { number: 95, nameEn: 'At-Tin', nameAr: 'التين', ayahCount: 8 },
  { number: 96, nameEn: "Al-'Alaq", nameAr: 'العلق', ayahCount: 19 },
  { number: 97, nameEn: 'Al-Qadr', nameAr: 'القدر', ayahCount: 5 },
  { number: 98, nameEn: 'Al-Bayyinah', nameAr: 'البينة', ayahCount: 8 },
  { number: 99, nameEn: 'Az-Zilzal', nameAr: 'الزلزلة', ayahCount: 8 },
  { number: 100, nameEn: "Al-'Adiyat", nameAr: 'العاديات', ayahCount: 11 },
  { number: 101, nameEn: "Al-Qari'ah", nameAr: 'القارعة', ayahCount: 11 },
  { number: 102, nameEn: 'At-Takathur', nameAr: 'التكاثر', ayahCount: 8 },
  { number: 103, nameEn: "Al-'Asr", nameAr: 'العصر', ayahCount: 3 },
  { number: 104, nameEn: 'Al-Humazah', nameAr: 'الهمزة', ayahCount: 9 },
  { number: 105, nameEn: 'Al-Fil', nameAr: 'الفيل', ayahCount: 5 },
  { number: 106, nameEn: 'Quraysh', nameAr: 'قريش', ayahCount: 4 },
  { number: 107, nameEn: "Al-Ma'un", nameAr: 'الماعون', ayahCount: 7 },
  { number: 108, nameEn: 'Al-Kawthar', nameAr: 'الكوثر', ayahCount: 3 },
  { number: 109, nameEn: 'Al-Kafirun', nameAr: 'الكافرون', ayahCount: 6 },
  { number: 110, nameEn: 'An-Nasr', nameAr: 'النصر', ayahCount: 3 },
  { number: 111, nameEn: 'Al-Masad', nameAr: 'المسد', ayahCount: 5 },
  { number: 112, nameEn: 'Al-Ikhlas', nameAr: 'الإخلاص', ayahCount: 4 },
  { number: 113, nameEn: 'Al-Falaq', nameAr: 'الفلق', ayahCount: 5 },
  { number: 114, nameEn: 'An-Nas', nameAr: 'الناس', ayahCount: 6 },
];

/** Search by surah number, surah name (en/ar), or "surah:ayah". Fallback: partial name match. */
export function searchSurahs(query: string, _lang: Language): SurahMeta[] {
  const q = query.trim();
  if (!q) return SURAH_LIST;
  const qLower = q.toLowerCase();
  const colon = q.indexOf(':');
  if (colon !== -1) {
    const sNum = parseInt(q.slice(0, colon), 10);
    if (sNum >= 1 && sNum <= 114) {
      const found = SURAH_LIST.find((s) => s.number === sNum);
      return found ? [found] : SURAH_LIST;
    }
  }
  const num = parseInt(q, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= 114) {
    const found = SURAH_LIST.find((s) => s.number === num);
    if (found) return [found];
  }
  const byName = SURAH_LIST.filter(
    (s) => s.nameEn.toLowerCase().includes(qLower) || s.nameAr.includes(q)
  );
  if (byName.length > 0) return byName;
  return SURAH_LIST.filter(
    (s) => s.nameEn.toLowerCase().includes(qLower) || s.nameAr.includes(q) || String(s.number).includes(q)
  );
}
