import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const connectionString =
  process.env['DATABASE_URL'] ?? 'postgresql://hourback:hourback@localhost:5432/hourback';
const isCloudOrSsl =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('neon.tech') ||
  connectionString.includes('supabase.co');

const config: Record<string, Knex.Config> = {
  development: {
    client: 'postgresql',
    connection: isCloudOrSsl
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : connectionString,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
      extension: 'ts',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  test: {
    client: 'postgresql',
    connection: process.env['DATABASE_URL'] ?? 'postgresql://hourback:hourback@localhost:5432/hourback_test',
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env['DATABASE_URL'],
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    pool: {
      min: 2,
      max: 20,
    },
  },
};

export default config;
module.exports = config; // needed for knex CLI
