const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const knex = require('knex');

const poisonBody = '{"test":"invalid HourBack message"}';

async function createSmokeServer() {
  const databaseUrl = process.env.HOURBACK_PUBSUB_TEST_DATABASE_URL;
  const dbTarget = new URL(databaseUrl ?? 'about:blank');
  if (dbTarget.hostname !== '127.0.0.1' || dbTarget.pathname !== '/hourback_pubsub_smoke') {
    throw new Error('Use a dedicated loopback PostgreSQL database named hourback_pubsub_smoke.');
  }
  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = 'test';
  process.env.LLM_PROVIDER = 'mock';
  process.env.MOCK_PROVIDER_MODE = 'valid';
  process.env.USE_LOCAL_QUEUE = 'false';

  const { createPubSubPushHandler } = require('../apps/worker/dist/pubsubPush');
  const { processMessageData } = require('../apps/worker/dist/handler');
  const { generateComments } = require('../apps/api/dist/services/commentService');
  const {
    generationPubSubTopic, publishGenerationMessage,
  } = require('../apps/api/dist/services/generationPubSub');
  const topic = generationPubSubTopic();
  if (!topic) throw new Error('Set PUBSUB_GENERATION_TOPIC to the isolated test topic.');

  const db = knex({
    client: 'pg',
    connection: databaseUrl,
    pool: { min: 0, max: 5, createTimeoutMillis: 1000 },
    acquireConnectionTimeout: 1500,
    migrations: {
      directory: path.resolve(__dirname, '../apps/api/dist/db/migrations'),
      loadExtensions: ['.js'],
    },
  });
  try {
    for (let retry = 0; ; retry++) {
      try {
        await db.raw('select 1');
        break;
      } catch (error) {
        if (retry === 24) throw error;
        await delay(500);
      }
    }
    if (await db.schema.hasTable('teachers')) throw new Error('Start with an empty test database.');
    await db.migrate.latest();
  } catch (error) {
    await db.destroy();
    throw error;
  }

  const state = {
    retryStudentId: null,
    retryMessageId: null,
    duplicateStudentId: null,
    duplicateIds: [],
    poisonId: null,
    jobId: null,
    deliveries: [],
  };

  const push = createPubSubPushHandler({
    subscription: process.env.PUBSUB_PUSH_SUBSCRIPTION,
    async process(message, delivery) {
      if (message.studentId === state.retryStudentId && !state.retryMessageId) {
        state.retryMessageId = delivery.messageId;
        throw new Error('Intentional one-time worker failure.');
      }
      await processMessageData(message);
    },
    log(delivery, outcome) {
      if (state.deliveries.length < 100) state.deliveries.push({ ...delivery, outcome });
      console.info(JSON.stringify({ event: 'hourback_pubsub_smoke', ...delivery, outcome }));
    },
  });

  async function enqueueFixtures() {
    const [teacher] = await db('teachers').insert({
      name: 'Synthetic teacher', email: 'pubsub-smoke@example.test', school: 'Synthetic school',
    }).returning('id');
    const [classroom] = await db('classes').insert({
      teacher_id: teacher.id, name: 'Smoke test class', grade: '7', subject: 'Math', academic_year: '2026',
    }).returning('id');
    const [period] = await db('report_periods').insert({
      class_id: classroom.id, name: 'Smoke test period', start_date: '2026-06-01', end_date: '2026-08-31',
    }).returning('id');
    const studentIds = Array.from({ length: 3 }, () => randomUUID());
    await db('students').insert(studentIds.map((id, index) => ({
      id, class_id: classroom.id, name: 'Synthetic student ' + (index + 1),
    })));
    await db('observations').insert(studentIds.map((student_id) => ({
      student_id, text: 'Explained a solution using a diagram.', tag: 'reasoning',
    })));
    state.duplicateStudentId = studentIds[0];
    state.retryStudentId = studentIds[1];

    // Exercise the same publisher used by the GraphQL report-generation mutation.
    const job = await generateComments(classroom.id, period.id, teacher.id, 'warm', 'short');
    state.jobId = job.id;
    const duplicate = {
      jobId: job.id, studentId: state.duplicateStudentId, periodId: period.id,
      tone: 'warm', length: 'short', attempt: 1,
    };
    state.duplicateIds = await Promise.all(
      Array.from({ length: 3 }, () => publishGenerationMessage(topic, duplicate)),
    );
    state.poisonId = await topic.publishMessage({ data: Buffer.from(poisonBody) });
  }

  function observed(messageId, outcome) {
    return state.deliveries.some((entry) => entry.messageId === messageId && entry.outcome === outcome);
  }

  async function status() {
    if (!state.jobId) return { ready: false, deliveries: state.deliveries };
    const [job, outcomes, drafts, citations] = await Promise.all([
      db('generation_jobs').where({ id: state.jobId }).first('total', 'done', 'failed', 'status'),
      db('generation_job_results').where({ job_id: state.jobId }).select('student_id', 'outcome'),
      db('report_comments').where({ job_id: state.jobId }).select('id', 'student_id'),
      db('comment_citations as c').join('report_comments as d', 'c.comment_id', 'd.id')
        .where('d.job_id', state.jobId).count('* as count').first(),
    ]);
    return {
      ready: true,
      job,
      counts: { outcomes: outcomes.length, drafts: drafts.length, citations: Number(citations.count) },
      checks: {
        completed: job.status === 'completed' && job.done === 3 && job.failed === 0 &&
          outcomes.length === 3 && outcomes.every(({ outcome }) => outcome === 'done') &&
          drafts.length === 3 && Number(citations.count) === 3,
        duplicates: new Set(state.duplicateIds).size === 3 &&
          state.duplicateIds.every((id) => observed(id, 'accepted')) &&
          drafts.filter(({ student_id }) => student_id === state.duplicateStudentId).length === 1 &&
          outcomes.filter(({ student_id }) => student_id === state.duplicateStudentId).length === 1,
        retry: observed(state.retryMessageId, 'retry') && observed(state.retryMessageId, 'accepted'),
        poisonRejected: observed(state.poisonId, 'invalid'),
      },
      deliveries: state.deliveries,
    };
  }

  let started;
  const server = createServer((request, response) => {
    const route = async () => {
      if (request.method === 'POST' && request.url === '/pubsub/push') {
        return push(request, response);
      }
      if (request.method === 'GET' && request.url === '/health') {
        response.writeHead(200).end('ok');
        return;
      }
      if (request.method === 'POST' && request.url === '/__smoke/start') {
        started ??= enqueueFixtures();
        await started;
        response.writeHead(202).end();
        return;
      }
      if (request.method === 'GET' && request.url === '/__smoke/status') {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(await status()));
        return;
      }
      response.writeHead(404).end();
    };
    void route().catch((error) => {
      console.error('Smoke request failed:', error.message);
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
  return { server, closeDatabase: () => db.destroy() };
}

module.exports = { createSmokeServer, poisonBody };

if (require.main === module) {
  createSmokeServer().then(({ server }) => {
    server.listen(Number(process.env.PORT ?? 8080), process.env.K_SERVICE ? '0.0.0.0' : '127.0.0.1');
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
