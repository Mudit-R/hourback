# HourBack report delivery on Google Cloud

Set `PUBSUB_GENERATION_TOPIC` to a full topic resource name on the authenticated API service. The report generation and regeneration mutations publish their existing generation payloads to that topic. Leave `USE_LOCAL_QUEUE` unset. With neither a Pub/Sub topic nor an SQS queue configured, the local dispatcher remains available.

Use a separate private Cloud Run service for push delivery. Build the existing Docker image after building the workspaces, and override its command to run `node apps/worker/dist/pubsubServer.js`. Set `PUBSUB_PUSH_SUBSCRIPTION` to the full push subscription name, supply `DATABASE_URL` from Secret Manager, and run the PostgreSQL migrations against the same database the API uses. Set the worker's model provider and credentials through its environment and secrets.

## IAM and delivery

- Grant the API runtime identity `roles/pubsub.publisher` on the report topic.
- Grant a dedicated push identity `roles/run.invoker` on the worker service. Keep the worker's IAM invoker check enabled and avoid public bindings. Grant the Pub/Sub service agent permission to mint an identity token for the push identity if the project does not already grant it.
- Create an authenticated, wrapped push subscription targeting `WORKER_URL/pubsub/push`, with `WORKER_URL` as the token audience. Use exponential retry backoff and a dead-letter topic with a pull subscription for operator review.
- Give the Pub/Sub service agent `roles/pubsub.publisher` on the dead-letter topic and `roles/pubsub.subscriber` on the source subscription so it can forward failed deliveries.

The worker accepts only the configured subscription envelope and a valid HourBack generation message. It acknowledges after processing and returns HTTP 503 for worker errors. Malformed messages return HTTP 400 so Pub/Sub can park them on the dead-letter topic. A permanently failed valid job needs operator reconciliation or replay from the dead-letter subscription. PostgreSQL commits the draft, citations, and one outcome per student and job in the same transaction. Concurrent duplicate messages can invoke the model more than once, while committed results and job progress are deduplicated. A failed publish is recorded as a failed student outcome. The API job write and broker publish are separate operations.

## Verify locally

Build the workspaces and start Google's Pub/Sub emulator on loopback. Start an empty local PostgreSQL 16 database named `hourback_pubsub_smoke`. The script applies the actual app migrations and uses synthetic students and the mock model provider.

~~~powershell
$env:PUBSUB_EMULATOR_HOST = '127.0.0.1:18685'
$env:HOURBACK_PUBSUB_TEST_DATABASE_URL = 'postgresql://hourback:hourback-local@127.0.0.1:15477/hourback_pubsub_smoke'
node scripts/verify-pubsub-delivery.cjs
~~~

The smoke run calls the application's generation service, receives broker HTTP pushes, injects one temporary failure, and requires redelivery of the same broker message ID. It publishes three extra copies of one logical job and checks the database for one draft and one outcome for that student. It also sends an invalid message and observes forwarding to a dead-letter subscription.

## Verify in a separate Cloud Run service

Use a billing-enabled project and a separate test service. The test manifest in `infra/cloud-run-pubsub-smoke.yaml` uses a single instance with a loopback PostgreSQL sidecar and synthetic fixtures. Its database is disposable and scoped to that instance.

1. Build the shared, LLM, worker, and API workspaces. Stage the workspace manifests, their compiled output, and `scripts/pubsub-smoke-server.cjs` in a clean build context. Use `infra/pubsub-smoke.Dockerfile` as its `Dockerfile`. Build and push the image to the test project's Artifact Registry.
2. Create the `hourback-pubsub-smoke-jobs` topic and a separate dead-letter topic with a pull subscription. Grant the test service identity publish access to the jobs topic.
3. Fill `GOOGLE_CLOUD_PROJECT`, `SMOKE_IMAGE`, and `SMOKE_RUNTIME_SERVICE_ACCOUNT` in a copy of the manifest. Deploy it with `gcloud run services replace` in the test region. Grant only the test operator and push identity access to invoke this private service.
4. Apply the push and dead-letter IAM and subscription configuration above. Use `hourback-pubsub-smoke-push` for the source subscription and set a five-attempt dead-letter policy.
5. Send an authenticated `POST /__smoke/start` and poll `GET /__smoke/status`. Check that completion, duplicates, retry, and poison rejection are all true. Pull the dead-letter subscription and check for the synthetic invalid message. An unauthenticated request to the service should fail at Cloud Run IAM.

See the [Cloud Run Pub/Sub guide](https://docs.cloud.google.com/run/docs/tutorials/pubsub) and [dead-letter configuration](https://docs.cloud.google.com/pubsub/docs/dead-letter-topics) for the deployment flags and IAM requirements.
