import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('teachers', (table) => {
    // Legacy/demo teachers remain passwordless and cannot sign in until reset.
    table.string('password_hash', 160);
  });

  await knex.schema.createTable('auth_sessions', (table) => {
    table.string('token_hash', 64).primary();
    table.uuid('teacher_id').notNullable().references('id').inTable('teachers').onDelete('CASCADE');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['teacher_id', 'expires_at'], 'idx_auth_sessions_teacher_expiry');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('auth_sessions');
  await knex.schema.alterTable('teachers', (table) => {
    table.dropColumn('password_hash');
  });
}
