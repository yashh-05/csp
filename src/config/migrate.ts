import fs from 'fs';
import path from 'path';
import { pool } from './db';

/**
 * Migration runner.
 * Reads the schema.sql file and executes it on the configured database pool.
 */
const runMigration = async () => {
  console.log('[Migration] Reading database schema file...');
  const schemaPath = path.resolve(__dirname, '../../../supabase/schema.sql');

  try {
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('[Migration] Connecting to database and running SQL commands...');

    // node-postgres executes multi-statement strings sequentially in one query call
    await pool.query(sql);

    console.log('[Migration] Database tables and triggers set up successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('[Migration] Fatal error running migration:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

runMigration();
