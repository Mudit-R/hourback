const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const apiRequire = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { PubSub } = apiRequire('@google-cloud/pubsub');
const { createSmokeServer, poisonBody } = require('./pubsub-smoke-server.cjs');

async function verify() {
  assert.match(process.env.PUBSUB_EMULATOR_HOST ?? '', /^127\.0\.0\.1:\d+$/,
    'Use a loopback Google Pub/Sub emulator.');
  const pubsub = new PubSub({ projectId: 'hourback-local' });
  const run = randomUUID().slice(0, 8);
  const [topic] = await pubsub.createTopic('hourback-reports-' + run);
  const [dlq] = await pubsub.createTopic('hourback-dead-' + run);
  const [parked] = await dlq.createSubscription('hourback-parked-' + run);
  const subscriptionId = 'hourback-push-' + run;
  process.env.PUBSUB_GENERATION_TOPIC = topic.name;
  process.env.PUBSUB_PUSH_SUBSCRIPTION = 'projects/hourback-local/subscriptions/' + subscriptionId;

  const { server, closeDatabase } = await createSmokeServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  let deadLetter;
  let subscriberError;
  parked.on('message', (message) => {
    if (message.data.toString() === poisonBody) deadLetter = message.id;
    message.ack();
  });
  parked.on('error', (error) => { subscriberError = error; });

  try {
    await topic.createSubscription(subscriptionId, {
      ackDeadlineSeconds: 10,
      pushConfig: { pushEndpoint: origin + '/pubsub/push' },
      retryPolicy: { minimumBackoff: { seconds: 1 }, maximumBackoff: { seconds: 5 } },
      deadLetterPolicy: { deadLetterTopic: dlq.name, maxDeliveryAttempts: 5 },
    });
    const started = await fetch(origin + '/__smoke/start', { method: 'POST' });
    assert.equal(started.status, 202, 'The application should enqueue its fixture jobs.');

    const deadline = Date.now() + 140_000;
    let report;
    while (Date.now() < deadline) {
      if (subscriberError) throw subscriberError;
      const response = await fetch(origin + '/__smoke/status');
      assert.equal(response.status, 200);
      report = await response.json();
      if (deadLetter && report.checks && Object.values(report.checks).every(Boolean)) {
        console.log('PASS: Pub/Sub push retries the same message after an HTTP 503.');
        console.log('PASS: Three separately published duplicates leave one outcome for the student.');
        console.log('PASS: Three synthetic students produce three drafts, citations, and completions.');
        console.log('PASS: Malformed message is delivered to the dead-letter subscription.');
        console.log(JSON.stringify({ ...report, deadLetter }, null, 2));
        return;
      }
      await delay(500);
    }
    assert.fail('Pub/Sub smoke run did not complete: ' + JSON.stringify({ report, deadLetter }));
  } finally {
    await parked.close();
    await pubsub.close();
    server.close();
    await closeDatabase();
  }
}

verify().then(() => process.exit(0)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
