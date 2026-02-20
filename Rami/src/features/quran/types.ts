/**
 * Quran feature types: Bookmark, LastRead for bookmarks and "continue reading".
 */
export interface Bookmark {
  surah: number;
  ayah: number;
}

export interface LastRead {
  surah: number;
  ayah: number;
  timestamp: number;
}
