import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

const ALLOWED_LANGUAGES = new Set(['en', 'ar', 'tr', 'fr', 'es', 'sv', 'de']);

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

// GET /api/qa - List all items (optional ?lang=xx)
router.get('/', async (req, res) => {
  try {
    const language = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const params: string[] = [];
    let whereClause = '';

    if (language) {
      if (!ALLOWED_LANGUAGES.has(language)) {
        return res.status(400).json({ error: 'Invalid language' });
      }
      params.push(language);
      whereClause = 'WHERE language = $1';
    }

    const result = await query(
      `
        SELECT id, title, body, tags, sources, language, created_at, updated_at
        FROM qa_items
        ${whereClause}
        ORDER BY created_at DESC
      `,
      params
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error('List QA items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/qa/:id - Get single item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
        SELECT id, title, body, tags, sources, language, created_at, updated_at
        FROM qa_items
        WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Get QA item error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/qa - Create new item
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, body, tags, sources, language } = req.body as {
      title?: string;
      body?: string;
      tags?: unknown;
      sources?: unknown;
      language?: string;
    };

    if (!title?.trim() || !body?.trim() || !language) {
      return res.status(400).json({ error: 'Title, body, and language are required' });
    }

    if (!ALLOWED_LANGUAGES.has(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    const normalizedTags = normalizeStringArray(tags);
    const normalizedSources = normalizeStringArray(sources);

    const result = await query(
      `
        INSERT INTO qa_items (title, body, tags, sources, language, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, body, tags, sources, language, created_at, updated_at
      `,
      [title.trim(), body.trim(), normalizedTags, normalizedSources, language, req.admin!.id]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error('Create QA item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/qa/:id - Update item
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, body, tags, sources, language } = req.body as {
      title?: string;
      body?: string;
      tags?: unknown;
      sources?: unknown;
      language?: string;
    };

    const existing = await query(`SELECT id FROM qa_items WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (language && !ALLOWED_LANGUAGES.has(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }
    if (body !== undefined) {
      updates.push(`body = $${paramCount++}`);
      values.push(body.trim());
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(normalizeStringArray(tags));
    }
    if (sources !== undefined) {
      updates.push(`sources = $${paramCount++}`);
      values.push(normalizeStringArray(sources));
    }
    if (language !== undefined) {
      updates.push(`language = $${paramCount++}`);
      values.push(language);
    }

    values.push(id);

    await query(`UPDATE qa_items SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);

    const result = await query(
      `
        SELECT id, title, body, tags, sources, language, created_at, updated_at
        FROM qa_items
        WHERE id = $1
      `,
      [id]
    );

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Update QA item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/qa/:id - Delete item
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM qa_items WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete QA item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
