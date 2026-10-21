import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const db = knex({
  client: 'postgresql',
  connection: process.env['DATABASE_URL'] ?? 'postgresql://hourback:hourback@localhost:5432/hourback',
  pool: { min: 2, max: 10 },
  asyncStackTraces: process.env['NODE_ENV'] !== 'production',
});

export default db;
