const assert = require('node:assert/strict');
const path = require('node:path');
const knex = require('knex');

async function verify() {
  const databaseUrl = process.env.HOURBACK_GENERATION_TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error('Set HOURBACK_GENERATION_TEST_DATABASE_URL to an empty local test database.');
  const target = new URL(databaseUrl);
  if (target.hostname !== '127.0.0.1' || target.pathname !== '/hourback_delivery_test') {
    throw new Error('Use a dedicated local PostgreSQL database named hourback_delivery_test.');
  }
  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = 'test';
  process.env.LLM_PROVIDER = 'mock';
  process.env.MOCK_PROVIDER_MODE = 'valid';
  const db = knex({
    client: 'pg',
    connection: databaseUrl,
    migrations: { directory: path.resolve(__dirname, '../apps/api/dist/db/migrations'), loadExtensions: ['.js'] },
  });

  try {
    assert.equal(await db.schema.hasTable('teachers'), false, 'Start with an empty database.');
    await db.migrate.up({ name: '20240101000001_initial_schema.js' });

    const [teacher] = await db('teachers').insert({
      name: 'Test Teacher', email: 'teacher@example.test', school: 'Test School',
    }).returning('id');
    const [classroom] = await db('classes').insert({
      teacher_id: teacher.id, name: 'Test Class', grade: '7', subject: 'Math', academic_year: '2026',
    }).returning('id');
    const [student, otherStudent] = await db('students').insert([
      { class_id: classroom.id, name: 'First Student' },
      { class_id: classroom.id, name: 'Second Student' },
    ]).returning('id');
    const [period] = await db('report_periods').insert({
      class_id: classroom.id, name: 'Test Period', start_date: '2026-06-01', end_date: '2026-08-31',
    }).returning('id');
    await db('observations').insert([
      { student_id: student.id, text: 'Explained a model in class.', tag: 'reasoning' },
      { student_id: otherStudent.id, text: 'Shared a solution in class.', tag: 'reasoning' },
    ]);

    async function createJob(total, done = 0) {
      const [job] = await db('generation_jobs').insert({
        class_id: classroom.id, teacher_id: teacher.id, period_id: period.id,
        total, done, status: 'running',
      }).returning('id');
      return job.id;
    }

    async function assertProgress(jobId, expected) {
      const progress = await db('generation_jobs').where({ id: jobId }).first('done', 'failed', 'status');
      assert.deepEqual(progress, expected);
    }

    function message(jobId, studentId) {
      return { jobId, studentId, periodId: period.id, tone: 'warm', length: 'short' };
    }

    const legacyJob = await createJob(2, 1);
    const [legacyDraft] = await db('report_comments').insert({
      job_id: legacyJob, student_id: student.id, period_id: period.id, draft_text: 'Previously saved draft',
    }).returning('id');
    await db.migrate.latest();
    const { processMessageData, recordGenerationFailure } = require('../apps/worker/dist');

    await processMessageData(message(legacyJob, student.id));
    await assertProgress(legacyJob, { done: 1, failed: 0, status: 'running' });
    await db('report_comments').where({ id: legacyDraft.id }).del();
    console.log('PASS: migration backfills existing drafts without double-counting progress');

    const job = await createJob(2);
    const firstDelivery = message(job, student.id);
    await Promise.all(Array.from({ length: 4 }, () => processMessageData(firstDelivery)));
    const drafts = await db('report_comments').where({ student_id: student.id, period_id: period.id });
    assert.equal(drafts.length, 1);
    assert.equal((await db('comment_citations').where({ comment_id: drafts[0].id })).length, 1);
    await assertProgress(job, { done: 1, failed: 0, status: 'running' });
    console.log('PASS: four concurrent deliveries create one draft, one citation, and one completion');

    await db('report_comments').where({ id: drafts[0].id }).del();
    await processMessageData(firstDelivery);
    assert.equal((await db('report_comments').where({ student_id: student.id })).length, 0);
    await assertProgress(job, { done: 1, failed: 0, status: 'running' });
    console.log('PASS: replay after draft deletion does not resurrect the draft');

    const secondDelivery = message(job, otherStudent.id);
    await Promise.all([recordGenerationFailure(secondDelivery), recordGenerationFailure(secondDelivery)]);
    await assertProgress(job, { done: 1, failed: 1, status: 'partial' });
    console.log('PASS: repeated failures advance progress once and finalize a partial job');

    const competingJobs = await Promise.all([createJob(1), createJob(1)]);
    await Promise.all(competingJobs.map((jobId) => processMessageData(message(jobId, otherStudent.id))));
    assert.equal((await db('report_comments').where({ student_id: otherStudent.id })).length, 1);
    for (const jobId of competingJobs) {
      await assertProgress(jobId, { done: 1, failed: 0, status: 'completed' });
    }
    console.log('PASS: different jobs share one draft while both settle independently');
  } finally {
    await db.destroy();
  }
}

// The long-lived application worker owns a separate connection pool.
verify().then(() => process.exit(0)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
