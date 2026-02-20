/**
 * Proxy for IslamicAPI Asma ul Husna.
 * Requires ISLAMIC_API_KEY in .env (get free key at islamicapi.com).
 */
import { Router } from 'express';

const router = Router();
const ISLAMIC_API_KEY = process.env.ISLAMIC_API_KEY;
const ISLAMIC_API_BASE = 'https://islamicapi.com/api/v1';

router.get('/asma-ul-husna', async (req, res) => {
  if (!ISLAMIC_API_KEY) {
    res.status(503).json({
      error: 'Asma ul Husna API not configured. Add ISLAMIC_API_KEY to backend .env.',
    });
    return;
  }

  const language = (req.query.language as string) || 'en';
  const url = `${ISLAMIC_API_BASE}/asma-ul-husna/?language=${encodeURIComponent(language)}&api_key=${ISLAMIC_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as {
      data?: { names?: { number: number; audio?: string; [k: string]: unknown }[] };
    };

    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }

    // Return names with full audio URLs
    const names = (data?.data?.names ?? []).map((n) => ({
      ...n,
      audioUrl: (n.audio?.startsWith('http') ? n.audio : `https://islamicapi.com${n.audio}`) as string,
    }));

    res.json({ names });
  } catch (err) {
    console.error('Asma API error:', err);
    res.status(500).json({ error: 'Failed to fetch Asma ul Husna' });
  }
});

export default router;
