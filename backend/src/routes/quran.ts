/**
 * Quran audio metadata, proxied from the Quran Foundation content API.
 *
 * What the app gains over building URLs itself: the reciter list comes from the
 * source instead of a hardcoded table, and every verse's audio URL for a surah
 * arrives in one request instead of being guessed per reciter and per CDN.
 *
 * Every route answers with absolute audio URLs, so the app never has to know
 * which CDN serves them.
 */
import { Router } from 'express';
import {
  quranContentGet,
  toAbsoluteAudioUrl,
  isQuranApiAuthenticated,
  QuranApiError,
} from '../services/quranApi';

const router = Router();

interface ApiRecitation {
  id: number;
  reciter_name?: string;
  style?: string | null;
  translated_name?: { name?: string };
}

interface ApiAudioFile {
  verse_key?: string;
  url?: string;
}

interface ApiChapterAudio {
  id?: number;
  chapter_id?: number;
  file_size?: number;
  format?: string;
  audio_url?: string;
}

function sendError(
  res: Parameters<Parameters<typeof router.get>[1]>[1],
  err: unknown
): void {
  const message = err instanceof Error ? err.message : 'Quran API unavailable';
  console.error('Quran API error:', message);
  res.status(503).json({ error: 'quran_api_unavailable' });
}

/** Every reciter the source offers, with its Arabic name where there is one. */
router.get('/recitations', async (req, res) => {
  const language = typeof req.query.language === 'string' ? req.query.language : 'ar';
  try {
    const data = await quranContentGet<{ recitations?: ApiRecitation[] }>('/resources/recitations', {
      language,
    });
    const recitations = (data?.recitations ?? []).map((r) => ({
      id: r.id,
      name: r.reciter_name ?? null,
      /** Mujawwad, Murattal, or null when the source does not say. */
      style: r.style ?? null,
      localizedName: r.translated_name?.name ?? null,
    }));
    res.json({ recitations, authenticated: isQuranApiAuthenticated() });
  } catch (err) {
    sendError(res, err);
  }
});

/**
 * Every verse's audio URL for one surah, in one request. This is what removes
 * the per-reciter URL guessing and lets playback prefetch the next verse
 * without a second round trip.
 */
router.get('/recitations/:id(\\d+)/chapter/:chapter(\\d+)', async (req, res) => {
  const id = Number(req.params.id);
  const chapter = Number(req.params.chapter);
  if (chapter < 1 || chapter > 114) {
    res.status(400).json({ error: 'invalid_chapter' });
    return;
  }

  try {
    const data = await quranContentGet<{ audio_files?: ApiAudioFile[] }>(
      `/quran/recitations/${id}`,
      { chapter_number: chapter }
    );
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const files = (data.audio_files ?? [])
      .filter((f) => f.verse_key && f.url)
      .map((f) => ({ verseKey: f.verse_key as string, url: toAbsoluteAudioUrl(f.url as string) }));
    res.json({ recitationId: id, chapter, files });
  } catch (err) {
    sendError(res, err);
  }
});

/**
 * The surah as a single file, with its size — which is what the offline screen
 * needs to state a real download size rather than an estimate.
 */
router.get('/chapter-recitation/:id(\\d+)/:chapter(\\d+)', async (req, res) => {
  const id = Number(req.params.id);
  const chapter = Number(req.params.chapter);

  try {
    const data = await quranContentGet<{ audio_file?: ApiChapterAudio }>(
      `/chapter_recitations/${id}/${chapter}`
    );
    const file = data?.audio_file;
    if (!file?.audio_url) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({
      recitationId: id,
      chapter,
      url: toAbsoluteAudioUrl(file.audio_url),
      fileSize: file.file_size ?? null,
      format: file.format ?? null,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
export { QuranApiError };
