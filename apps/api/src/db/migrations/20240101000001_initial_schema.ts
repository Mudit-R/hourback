import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Teachers ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('teachers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 255).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('school', 255).notNullable();
    t.timestamps(true, true);
  });

  // ── Classes ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('classes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('teacher_id').notNullable().references('id').inTable('teachers').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('grade', 50).notNullable();
    t.string('subject', 255).notNullable();
    t.string('academic_year', 20).notNullable();
    t.timestamps(true, true);
    t.index(['teacher_id'], 'idx_classes_teacher_id');
  });

  // ── Students ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('students', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('preferred_name', 100);
    t.timestamps(true, true);
    t.index(['class_id'], 'idx_students_class_id');
  });

  // ── Units ─────────────────────────────────────────────────────────────────
  await knex.schema.createTable('units', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('description');
    t.date('start_date');
    t.date('end_date');
    t.timestamps(true, true);
  });

  // ── Assessments ───────────────────────────────────────────────────────────
  await knex.schema.createTable('assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('unit_id').notNullable().references('id').inTable('units').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.string('type', 50).notNullable().defaultTo('criteria'); // criteria | rubric | checklist
    t.timestamps(true, true);
  });

  // ── Criteria ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('criteria', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('assessment_id').notNullable().references('id').inTable('assessments').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.integer('max_level').notNullable().defaultTo(8); // PYP ATL style 1-8
    t.text('description');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.index(['assessment_id'], 'idx_criteria_assessment_id');
  });

  // ── Report Periods ────────────────────────────────────────────────────────
  await knex.schema.createTable('report_periods', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.string('name', 100).notNullable();   // e.g. "Semester 1 2025"
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.timestamps(true, true);
    t.index(['class_id'], 'idx_report_periods_class_id');
  });

  // ── Assessment Results ────────────────────────────────────────────────────
  await knex.schema.createTable('assessment_results', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.uuid('criterion_id').notNullable().references('id').inTable('criteria').onDelete('CASCADE');
    t.integer('level').notNullable();          // 1-8
    t.text('feedback');                        // teacher's short note on this criterion
    t.timestamps(true, true);
    t.unique(['student_id', 'criterion_id'], { useConstraint: true });
    t.index(['student_id'], 'idx_assessment_results_student');
    t.index(['criterion_id'], 'idx_assessment_results_criterion');
  });

  // ── Observations ──────────────────────────────────────────────────────────
  await knex.schema.createTable('observations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.text('text').notNullable();
    t.string('tag', 100);  // e.g. "collaboration", "math", "attitude"
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['student_id'], 'idx_observations_student');
    t.index(['student_id', 'created_at'], 'idx_observations_student_time');
  });

  // ── Generation Jobs ───────────────────────────────────────────────────────
  await knex.schema.createTable('generation_jobs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    t.uuid('period_id').notNullable().references('id').inTable('report_periods').onDelete('CASCADE');
    t.uuid('teacher_id').notNullable().references('id').inTable('teachers').onDelete('CASCADE');
    t.integer('total').notNullable().defaultTo(0);
    t.integer('done').notNullable().defaultTo(0);
    t.integer('failed').notNullable().defaultTo(0);
    t.string('status', 50).notNullable().defaultTo('pending');
    // status: pending | running | completed | partial | failed
    t.string('tone', 50).notNullable().defaultTo('warm');
    t.string('length', 50).notNullable().defaultTo('medium');
    t.timestamps(true, true);
    t.index(['class_id', 'period_id'], 'idx_jobs_class_period');
    t.index(['status'], 'idx_jobs_status');
  });

  // ── Report Comments ───────────────────────────────────────────────────────
  await knex.schema.createTable('report_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.uuid('period_id').notNullable().references('id').inTable('report_periods').onDelete('CASCADE');
    t.uuid('job_id').references('id').inTable('generation_jobs').onDelete('SET NULL');
    t.text('draft_text').notNullable();
    t.text('final_text');
    t.string('status', 50).notNullable().defaultTo('draft');
    // status: draft | edited | approved | flagged
    t.string('model', 100);              // e.g. gemini-1.5-pro
    t.float('groundedness_score');       // 0.0-1.0
    t.integer('edit_distance');          // Levenshtein distance final vs draft
    t.integer('generation_ms');          // wall-clock time for LLM call
    t.string('tone', 50);
    t.string('length', 50);
    t.timestamps(true, true);
    t.unique(['student_id', 'period_id'], { useConstraint: true });
    t.index(['student_id', 'period_id'], 'idx_comments_student_period');
    t.index(['job_id'], 'idx_comments_job');
    t.index(['status'], 'idx_comments_status');
  });

  // ── Comment Citations ─────────────────────────────────────────────────────
  await knex.schema.createTable('comment_citations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('comment_id').notNullable().references('id').inTable('report_comments').onDelete('CASCADE');
    t.integer('sentence_idx').notNullable();
    t.string('source_type', 50).notNullable(); // observation | assessment_result
    t.uuid('source_id').notNullable();
    t.index(['comment_id'], 'idx_citations_comment');
  });

  // ── Time Logs ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('time_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('teacher_id').notNullable().references('id').inTable('teachers').onDelete('CASCADE');
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.uuid('period_id').notNullable().references('id').inTable('report_periods').onDelete('CASCADE');
    t.string('mode', 50).notNullable(); // manual | assisted
    t.integer('seconds').notNullable();
    t.timestamps(true, true);
    t.index(['teacher_id', 'period_id'], 'idx_timelogs_teacher_period');
    t.index(['mode'], 'idx_timelogs_mode');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('time_logs');
  await knex.schema.dropTableIfExists('comment_citations');
  await knex.schema.dropTableIfExists('report_comments');
  await knex.schema.dropTableIfExists('generation_jobs');
  await knex.schema.dropTableIfExists('observations');
  await knex.schema.dropTableIfExists('assessment_results');
  await knex.schema.dropTableIfExists('report_periods');
  await knex.schema.dropTableIfExists('criteria');
  await knex.schema.dropTableIfExists('assessments');
  await knex.schema.dropTableIfExists('units');
  await knex.schema.dropTableIfExists('students');
  await knex.schema.dropTableIfExists('classes');
  await knex.schema.dropTableIfExists('teachers');
}
