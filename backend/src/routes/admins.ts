import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { authenticateToken, requireSuperadmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/admins - List all admins (superadmin only)
router.get('/', authenticateToken, requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    const result = await query(`
      SELECT id, username, role, created_at
      FROM admins
      ORDER BY created_at DESC
    `);

    res.json({ admins: result.rows });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// POST /api/admins - Create new admin (superadmin only)
router.post('/', authenticateToken, requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    const { username, password, role = 'admin' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if username exists
    const existing = await query(
      `SELECT id FROM admins WHERE username = $1`,
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(`
      INSERT INTO admins (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, created_at
    `, [username, passwordHash, role]);

    res.status(201).json({ admin: result.rows[0] });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// PUT /api/admins/:id - Update admin (superadmin only)
router.put('/:id', authenticateToken, requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Prevent self-demotion
    if (parseInt(id) === req.admin!.id && role && role !== 'superadmin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (username) {
      // Check if new username is taken
      const existing = await query(
        `SELECT id FROM admins WHERE username = $1 AND id != $2`,
        [username, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      const hash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(hash);
    }

    if (role) {
      if (!['admin', 'superadmin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(`
      UPDATE admins
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, role, created_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ admin: result.rows[0] });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

// DELETE /api/admins/:id - Delete admin (superadmin only)
router.delete('/:id', authenticateToken, requireSuperadmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.admin!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const result = await query(
      `DELETE FROM admins WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

export default router;
