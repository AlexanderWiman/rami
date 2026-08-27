/**
 * Aggregate counters for a handful of named events.
 *
 * Deliberately just a number per name: no device id, no user, no timestamp per
 * tap, nothing that could identify anyone. It answers "how many times was this
 * pressed" and cannot answer "by whom", which keeps it clear of anything that
 * would need consent or a privacy notice.
 *
 * Only the names below are accepted, so an open increment endpoint cannot be
 * used to create rows at will.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();

/** The events worth counting. Anything else is rejected. */
const KNOWN_METRICS = new Set(['gift_button_tap']);

/**
 * Generous, but enough that one device cannot inflate the number by orders of
 * magnitude. The count is a rough signal, not an audited figure.
 */
const tapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'too_many_requests' },
});

/** Increment a counter. Open on purpose — the app is not signed in. */
router.post('/:name/tap', tapLimiter, async (req, res) => {
  const name = req.params.name;
  if (!KNOWN_METRICS.has(name)) {
    res.status(404).json({ error: 'unknown_metric' });
    return;
  }

  try {
    await query(
      `INSERT INTO metric_counters (name, count, updated_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT (name)
       DO UPDATE SET count = metric_counters.count + 1, updated_at = NOW()`,
      [name]
    );
    // No body: the app fires this and forgets it.
    res.status(204).end();
  } catch (err) {
    console.error('Metric increment failed:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'increment_failed' });
  }
});

/** Read the counters. Behind admin auth — this is a business number. */
router.get('/', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT name, count, updated_at FROM metric_counters ORDER BY name'
    );
    res.json({
      metrics: result.rows.map((row: { name: string; count: string; updated_at: string }) => ({
        name: row.name,
        // BIGINT arrives as a string from pg; a tap count fits a number safely.
        count: Number(row.count),
        updatedAt: row.updated_at,
      })),
    });
  } catch (err) {
    console.error('Metric read failed:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'read_failed' });
  }
});

export default router;
