/**
 * Database migration — run manually to ensure tables exist.
 * Usage: railway run npm run db:migrate
 * Or: npx tsx src/db/migrate.ts (with DATABASE_URL in env)
 */
import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase, query, seedSuperadmin } from './index';

async function migrate() {
  console.log('Starting database migration...');

  try {
    await initializeDatabase();
    console.log('✓ Tables created/updated');

    await seedSuperadmin();
    console.log('✓ Superadmin seeded (if needed)');

    const admins = await query('SELECT COUNT(*) FROM admins');
    const threads = await query('SELECT COUNT(*) FROM threads');
    const content = await query('SELECT COUNT(*) FROM thread_content');
    console.log('✓ admins:', admins.rows[0].count);
    console.log('✓ threads:', threads.rows[0].count);
    console.log('✓ thread_content:', content.rows[0].count);

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
