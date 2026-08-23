/**
 * Colour tone for an Arabic grading string. The grading text itself is always
 * shown verbatim — the tone only drives the badge colour, so an unrecognised
 * wording degrades to neutral instead of guessing.
 */
export type GradeTone = 'sahih' | 'hasan' | 'daif' | 'unknown';

/** Weak/rejected wordings — checked first, since "ليس بصحيح" contains "صحيح". */
const DAIF_PATTERNS = [
  'ضعيف',
  'ضعف',
  'منكر',
  'موضوع',
  'باطل',
  'لا يصح',
  'لا أصل له',
  'ليس بصحيح',
  'ليس بثابت',
  'واه',
  'مرسل',
  'شاذ',
  'مضطرب',
  'متروك',
  'كذب',
];

const HASAN_PATTERNS = ['حسن', 'جيد', 'لا بأس به'];

const SAHIH_PATTERNS = ['صحيح', 'ثابت', 'متفق عليه', 'إسناده صحيح', 'صححه'];

export function classifyGrade(grade: string): GradeTone {
  const text = grade.trim();
  if (text.length === 0) return 'unknown';
  if (DAIF_PATTERNS.some((p) => text.includes(p))) return 'daif';
  if (SAHIH_PATTERNS.some((p) => text.includes(p))) return 'sahih';
  if (HASAN_PATTERNS.some((p) => text.includes(p))) return 'hasan';
  return 'unknown';
}
