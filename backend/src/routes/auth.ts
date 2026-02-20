import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await query(
      `SELECT id, username, password_hash, role FROM admins WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin.id, admin.username, admin.role);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    const msg = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({ error: msg });
  }
});

// GET /api/auth/me - Get current admin info
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await query(
      `SELECT id, username, role, created_at FROM admins WHERE id = $1`,
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ admin: result.rows[0] });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get admin info' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await query(
      `SELECT password_hash FROM admins WHERE id = $1`,
      [req.admin!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE admins SET password_hash = $1 WHERE id = $2`,
      [newHash, req.admin!.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
