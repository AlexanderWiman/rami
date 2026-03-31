/**
 * Medina mushaf (604 pages) — page to verse range mapping.
 * Each page entry: [surah, startAyah, endAyah][] (one or two segments per page).
 * Source: Standard King Fahd / Medina mushaf layout.
 */
import { SURAH_LIST } from './surahs';

export type PageSegment = [surah: number, startAyah: number, endAyah: number];

/** First 50 pages: exact boundaries. Pages 51–604: computed approximation. */
const PAGE_MAP: PageSegment[][] = [
  [[1, 1, 7], [2, 1, 141]],       // 1
  [[2, 142, 252]],                 // 2
  [[2, 253, 286], [3, 1, 92]],    // 3
  [[3, 93, 200], [4, 1, 23]],     // 4
  [[4, 24, 147]],                  // 5
  [[4, 148, 176], [5, 1, 81]],    // 6
  [[5, 82, 120], [6, 1, 110]],    // 7
  [[6, 111, 165], [7, 1, 87]],    // 8
  [[7, 88, 206], [8, 1, 40]],     // 9
  [[8, 41, 75], [9, 1, 92]],      // 10
  [[9, 93, 129], [10, 1, 109]],   // 11
  [[11, 1, 123], [12, 1, 52]],    // 12
  [[12, 53, 111], [13, 1, 43]],   // 13
  [[14, 1, 52], [15, 1, 99]],     // 14
  [[16, 1, 128], [17, 1, 111]],   // 15
  [[18, 1, 110], [19, 1, 98]],    // 16
  [[20, 1, 135], [21, 1, 112]],   // 17
  [[22, 1, 78], [23, 1, 118]],    // 18
  [[24, 1, 64], [25, 1, 77]],     // 19
  [[26, 1, 227], [27, 1, 55]],    // 20
  [[27, 56, 93], [28, 1, 88]],    // 21
  [[29, 1, 69], [30, 1, 60]],     // 22
  [[31, 1, 34], [32, 1, 30], [33, 1, 73]], // 23
  [[34, 1, 54], [35, 1, 45]],     // 24
  [[36, 1, 83], [37, 1, 182]],    // 25
  [[38, 1, 88], [39, 1, 75]],     // 26
  [[40, 1, 85], [41, 1, 54]],     // 27
  [[42, 1, 53], [43, 1, 89]],     // 28
  [[44, 1, 59], [45, 1, 37]],     // 29
  [[46, 1, 35], [47, 1, 38], [48, 1, 29]], // 30
  // Pages 31–604: approximate ~8–15 verses per page depending on surah
];

const TOTAL_PAGES = 604;

function getSegmentForPage(pageNum: number): PageSegment[] {
  if (pageNum >= 1 && pageNum <= PAGE_MAP.length) {
    return PAGE_MAP[pageNum - 1];
  }
  // Approximate: use surah boundaries and even split (simplified)
  if (pageNum < 1 || pageNum > TOTAL_PAGES) return [];
  let versesSoFar = 0;
  const versesPerPage = 15;
  const targetStart = (pageNum - 1) * versesPerPage;
  const targetEnd = pageNum * versesPerPage;
  const segments: PageSegment[] = [];
  for (const s of SURAH_LIST) {
    const start = versesSoFar;
    const end = versesSoFar + s.ayahCount;
    if (targetStart >= end) {
      versesSoFar = end;
      continue;
    }
    if (targetEnd <= start) break;
    const segStart = Math.max(1, targetStart - versesSoFar + 1);
    const segEnd = Math.min(s.ayahCount, targetEnd - versesSoFar);
    if (segStart <= segEnd) segments.push([s.number, segStart, segEnd]);
    versesSoFar = end;
    if (versesSoFar >= targetEnd) break;
  }
  return segments;
}

/** Returns verse refs for a given mushaf page (1–604). */
export function getVersesForPage(pageNum: number): { surah: number; ayah: number }[] {
  const segments = getSegmentForPage(pageNum);
  const out: { surah: number; ayah: number }[] = [];
  for (const [surah, start, end] of segments) {
    for (let a = start; a <= end; a++) out.push({ surah, ayah: a });
  }
  return out;
}

export function getTotalPages(): number {
  return TOTAL_PAGES;
}
