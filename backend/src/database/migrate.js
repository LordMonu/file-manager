import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { closeDatabase, hasDatabase, query, withDatabaseClient } from '../config/database.js';

const currentFile = fileURLToPath(import.meta.url);
const migrationsDir = path.join(path.dirname(currentFile), 'migrations');

async function migrate() {
  if (!hasDatabase()) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  await query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const applied = await query('select id from schema_migrations where id = $1', [file]);
    if (applied.rowCount > 0) continue;

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await withDatabaseClient(async (client) => {
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (id) values ($1)', [file]);
        await client.query('commit');
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    });
  }
}

migrate()
  .then(async () => {
    await closeDatabase();
    console.log('Migrations complete');
  })
  .catch(async (error) => {
    await closeDatabase();
    console.error(error.message);
    process.exitCode = 1;
  });
