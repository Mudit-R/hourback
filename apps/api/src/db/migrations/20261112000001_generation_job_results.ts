import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('generation_job_results', (table) => {
    table.uuid('job_id').notNullable().references('id').inTable('generation_jobs').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.enum('outcome', ['done', 'failed']).notNullable();
    table.primary(['job_id', 'student_id']);
    table.index(['student_id']);
  });

  // The job ledger is internal to the backend. Give no Data API roles access.
  await knex.raw('ALTER TABLE generation_job_results ENABLE ROW LEVEL SECURITY');

  // Preserve outcomes for jobs started before this migration.
  await knex.raw(
    "INSERT INTO generation_job_results (job_id, student_id, outcome) " +
      "SELECT job_id, student_id, CASE WHEN status = 'flagged' THEN 'failed' ELSE 'done' END " +
      'FROM report_comments WHERE job_id IS NOT NULL',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('generation_job_results');
}
