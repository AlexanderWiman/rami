/**
 * Removes diacritical marks from a string using Unicode NFD decomposition.
 * Handles Arabic (tashkeel/harakat), Latin (é→e, ü→u), and other scripts.
 * E.g. "مُحَمَّد" and "محمد" match, "café" and "cafe" match.
 */
export function stripDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
}

/**
 * Normalizes text for hadith search: trims, strips diacritics, and lowercases.
 */
export function normalizeForHadithSearch(str: string): string {
  const trimmed = str.trim();
  const withoutDiacritics = stripDiacritics(trimmed);
  return withoutDiacritics.toLowerCase();
}
