import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export async function initializeDatabase() {
  // Create tables
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS threads (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      created_by INTEGER REFERENCES admins(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      pinned BOOLEAN DEFAULT FALSE,
      category VARCHAR(20) DEFAULT 'community' CHECK (category IN ('community', 'sources'))
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS thread_content (
      id SERIAL PRIMARY KEY,
      thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
      created_by INTEGER REFERENCES admins(id),
      created_at TIMESTAMP DEFAULT NOW(),
      content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'file')),
      content TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS qa_items (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      tags TEXT[] DEFAULT '{}',
      sources TEXT[] DEFAULT '{}',
      language VARCHAR(5) NOT NULL CHECK (language IN ('en', 'ar', 'tr')),
      created_by INTEGER REFERENCES admins(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Ensure content_type constraint includes file uploads
  await query(`
    ALTER TABLE thread_content
    DROP CONSTRAINT IF EXISTS thread_content_content_type_check;
  `);
  await query(`
    ALTER TABLE thread_content
    ADD CONSTRAINT thread_content_content_type_check
    CHECK (content_type IN ('text', 'image', 'video', 'file'));
  `);

  await query(`
    ALTER TABLE thread_content
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id);
  `);
  await query(`
    ALTER TABLE thread_content
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);

  await query(`
    ALTER TABLE threads
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'community';
  `);

  await query(`
    ALTER TABLE threads
    DROP CONSTRAINT IF EXISTS threads_category_check;
  `);
  await query(`
    ALTER TABLE threads
    ADD CONSTRAINT threads_category_check
    CHECK (category IN ('community', 'sources'));
  `);

  // Create indexes
  await query(`
    CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
  `);
  
  await query(`
    CREATE INDEX IF NOT EXISTS idx_threads_pinned ON threads(pinned DESC, created_at DESC);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_threads_category ON threads(category);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_thread_content_thread_id ON thread_content(thread_id);
  `);

  // Text highlights: [{start, end, color}] for admin-colored text spans
  await query(`
    ALTER TABLE thread_content
    ADD COLUMN IF NOT EXISTS text_highlights JSONB DEFAULT '[]';
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_qa_items_language ON qa_items(language);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_qa_items_created_at ON qa_items(created_at DESC);
  `);
}

export async function seedSuperadmin() {
  const username = process.env.INITIAL_SUPERADMIN_USERNAME || 'admin';
  const password = process.env.INITIAL_SUPERADMIN_PASSWORD;

  if (!password) {
    console.log('No INITIAL_SUPERADMIN_PASSWORD set, skipping superadmin seed');
    return;
  }

  // Check if any superadmin exists
  const result = await query(
    `SELECT id FROM admins WHERE role = 'superadmin' LIMIT 1`
  );

  if (result.rows.length === 0) {
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, 'superadmin')`,
      [username, passwordHash]
    );
    console.log(`Superadmin '${username}' created`);
  } else {
    console.log('Superadmin already exists, skipping seed');
  }
}

export default pool;
