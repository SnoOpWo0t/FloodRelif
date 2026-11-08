import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(sql);
    console.log('Database tables (users, assistance_requests) initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();

