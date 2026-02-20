import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Types
interface ThreadContent {
  id?: number;
  content_type: 'text' | 'image' | 'video' | 'file';
  content: string;
  sort_order: number;
}

const ALLOWED_CATEGORIES = new Set(['community', 'sources']);

// GET /api/threads - List all threads
router.get('/', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : 'community';
    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const result = await query(`
      SELECT 
        t.id,
        t.title,
        t.created_at,
        t.updated_at,
        t.pinned,
        t.category,
        a.username as created_by_username,
        (SELECT COUNT(*) FROM thread_content WHERE thread_id = t.id) as content_count
      FROM threads t
      LEFT JOIN admins a ON t.created_by = a.id
      WHERE t.category = $1
      ORDER BY t.pinned DESC, t.created_at DESC
    `, [category]);

    res.json({ threads: result.rows });
  } catch (error) {
    console.error('List threads error:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// GET /api/threads/:id - Get single thread with content
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const threadResult = await query(`
      SELECT 
        t.id,
        t.title,
        t.created_at,
        t.updated_at,
        t.pinned,
        t.category,
        a.username as created_by_username
      FROM threads t
      LEFT JOIN admins a ON t.created_by = a.id
      WHERE t.id = $1
    `, [id]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const contentResult = await query(`
      SELECT c.id, c.content_type, c.content, c.sort_order, c.created_at,
             a.username as created_by_username,
             COALESCE(c.text_highlights, '[]') as text_highlights
      FROM thread_content c
      LEFT JOIN admins a ON c.created_by = a.id
      WHERE c.thread_id = $1
      ORDER BY c.sort_order ASC
    `, [id]);

    res.json({
      thread: threadResult.rows[0],
      content: contentResult.rows,
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// POST /api/threads - Create new thread
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, content, pinned = false, category = 'community' } = req.body as {
      title: string;
      content: ThreadContent[];
      pinned?: boolean;
      category?: string;
    };

    if (!title || !content || !Array.isArray(content)) {
      return res.status(400).json({ error: 'Title and content array required' });
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Create thread
    const threadResult = await query(`
      INSERT INTO threads (title, created_by, pinned, category)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, created_at, updated_at, pinned, category
    `, [title, req.admin!.id, pinned, category]);

    const thread = threadResult.rows[0];

    // Insert content blocks
    for (let i = 0; i < content.length; i++) {
      const block = content[i];
      await query(`
        INSERT INTO thread_content (thread_id, created_by, content_type, content, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [thread.id, req.admin!.id, block.content_type, block.content, i]);
    }

    // Fetch the complete thread with content
    const contentResult = await query(`
      SELECT c.id, c.content_type, c.content, c.sort_order, c.created_at,
             a.username as created_by_username
      FROM thread_content c
      LEFT JOIN admins a ON c.created_by = a.id
      WHERE c.thread_id = $1
      ORDER BY c.sort_order ASC
    `, [thread.id]);

    res.status(201).json({
      thread: {
        ...thread,
        created_by_username: req.admin!.username,
      },
      content: contentResult.rows,
    });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// PUT /api/threads/:id - Update thread
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content, pinned } = req.body as {
      title?: string;
      content?: ThreadContent[];
      pinned?: boolean;
    };

    // Check if thread exists
    const existingThread = await query(`SELECT id FROM threads WHERE id = $1`, [id]);
    if (existingThread.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Update thread metadata
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (pinned !== undefined) {
      updates.push(`pinned = $${paramCount++}`);
      values.push(pinned);
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);

    await query(
      `UPDATE threads SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Update content if provided
    if (content && Array.isArray(content)) {
      // Delete existing content
      await query(`DELETE FROM thread_content WHERE thread_id = $1`, [id]);

      // Insert new content
      for (let i = 0; i < content.length; i++) {
        const block = content[i];
        await query(`
          INSERT INTO thread_content (thread_id, created_by, content_type, content, sort_order)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, req.admin!.id, block.content_type, block.content, i]);
      }
    }

    // Fetch updated thread
    const threadResult = await query(`
      SELECT 
        t.id, t.title, t.created_at, t.updated_at, t.pinned, t.category,
        a.username as created_by_username
      FROM threads t
      LEFT JOIN admins a ON t.created_by = a.id
      WHERE t.id = $1
    `, [id]);

    const contentResult = await query(`
      SELECT c.id, c.content_type, c.content, c.sort_order, c.created_at,
             a.username as created_by_username,
             COALESCE(c.text_highlights, '[]') as text_highlights
      FROM thread_content c
      LEFT JOIN admins a ON c.created_by = a.id
      WHERE c.thread_id = $1
      ORDER BY c.sort_order ASC
    `, [id]);

    res.json({
      thread: threadResult.rows[0],
      content: contentResult.rows,
    });
  } catch (error) {
    console.error('Update thread error:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

// PATCH /api/threads/:id/content/:contentId/highlights - Update text highlights for a content block
router.patch('/:id/content/:contentId/highlights', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id, contentId } = req.params;
    const { highlights } = req.body as { highlights: Array<{ start: number; end: number; color: string }> };

    if (!highlights || !Array.isArray(highlights)) {
      return res.status(400).json({ error: 'highlights array required' });
    }

    const valid = highlights.every(
      (h) =>
        typeof h.start === 'number' &&
        typeof h.end === 'number' &&
        typeof h.color === 'string' &&
        h.start >= 0 &&
        h.end > h.start &&
        /^#[0-9A-Fa-f]{6}$/.test(h.color)
    );
    if (!valid) {
      return res.status(400).json({ error: 'Invalid highlights format' });
    }

    const result = await query(
      `UPDATE thread_content
       SET text_highlights = $1
       WHERE id = $2 AND thread_id = $3
       RETURNING id`,
      [JSON.stringify(highlights), contentId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Update highlights error:', error);
    res.status(500).json({ error: 'Failed to update highlights' });
  }
});

// DELETE /api/threads/:id - Delete thread
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await query(`DELETE FROM threads WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

export default router;
