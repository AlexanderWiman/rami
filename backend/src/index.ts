import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { initializeDatabase, seedSuperadmin } from './db';
import authRoutes from './routes/auth';
import threadsRoutes from './routes/threads';
import uploadRoutes from './routes/upload';
import adminsRoutes from './routes/admins';
import qaRoutes from './routes/qa';
import asmaRoutes from './routes/asma';
import pushRoutes from './routes/push';
import hadithRoutes from './routes/hadith';
import { startPushScheduler } from './services/pushScheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many login attempts, please try again later' },
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api', asmaRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/hadith', hadithRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check (for debugging)
app.get('/health/db', async (req, res) => {
  try {
    const { query } = await import('./db');
    await query('SELECT 1');
    const admins = await query('SELECT COUNT(*) FROM admins');
    const threads = await query('SELECT COUNT(*) FROM threads');
    const content = await query('SELECT COUNT(*) FROM thread_content');
    res.json({
      ok: true,
      admins: admins.rows[0].count,
      threads: threads.rows[0].count,
      thread_content: content.rows[0].count,
    });
  } catch (err) {
    console.error('Health DB error:', err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Database error',
    });
  }
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized');

    // Seed superadmin if needed
    await seedSuperadmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startPushScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
