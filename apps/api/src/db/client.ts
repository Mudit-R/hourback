import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const rawConnectionString =
  process.env['DATABASE_URL'] ?? 'postgresql://hourback:hourback@localhost:5432/hourback';
const isCloudOrSsl =
  rawConnectionString.includes('sslmode=require') ||
  rawConnectionString.includes('neon.tech') ||
  rawConnectionString.includes('supabase.co') ||
  rawConnectionString.includes('supabase.com') ||
  process.env['NODE_ENV'] === 'production';
const connectionString = rawConnectionString.replace(/[\?&]sslmode=[^&]+/, '');

const db = knex({
  client: 'postgresql',
  connection: isCloudOrSsl
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : connectionString,
  pool: { min: 2, max: 10 },
  asyncStackTraces: process.env['NODE_ENV'] !== 'production',
});

export default db;
