import fs from 'fs';
import path from 'path';
import { sequelize } from './sequelize';

/**
 * Applies every migrations/*.sql file in name order. The SQL files are written to be
 * idempotent (ADD COLUMN IF NOT EXISTS ...), so this is safe to run on every deploy and
 * on an imported production dump. Unlike `npm run seed`, it never alters other tables
 * or inserts demo data.
 *   npm run migrate        (dev, ts-node)
 *   npm run migrate:prod   (after npm run build)
 */
export async function runMigrations(): Promise<string[]> {
  const dir = path.resolve(process.cwd(), 'migrations');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort() : [];
  await sequelize.authenticate();
  for (const f of files) {
    await sequelize.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    // eslint-disable-next-line no-console
    console.log(`applied ${f}`);
  }
  return files;
}

if (require.main === module) {
  runMigrations()
    .then(() => sequelize.close())
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
