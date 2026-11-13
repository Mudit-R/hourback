# AWS SQS and Lambda worker

This SAM stack packages the existing TypeScript SQS worker as a Lambda container image. It creates an encrypted generation queue and dead-letter queue, a five-receive redrive policy, and a Lambda event source mapping that reports individual batch failures.

The stack also creates a producer policy scoped to the generation queue. Attach it to the AWS identity used by the API publisher, then set `SQS_QUEUE_URL` to the `GenerationQueueUrl` stack output. The API uses the AWS default credential chain in AWS. It uses test credentials only when a LocalStack endpoint is configured.

## Prerequisites

- AWS CLI configured for a development account and region
- AWS SAM CLI and Docker
- A PostgreSQL database reachable from Lambda
- A Secrets Manager secret containing a `DATABASE_URL` field
- A separate Secrets Manager secret containing a `GEMINI_API_KEY` field when using Gemini

The existing Cloud Run API does not automatically receive AWS credentials. To publish from Cloud Run, configure workload identity federation or another short-lived credential flow separately and grant only the generated producer policy. Do not copy long-lived access keys into Cloud Run environment variables.

## Deploy

From the repository root, validate and build the stack:

```sh
sam validate --template-file infra/aws-sam-template.yaml --lint
sam build --template-file infra/aws-sam-template.yaml
```

Deploy the built stack with guided prompts:

```sh
sam deploy --guided --template-file .aws-sam/build/template.yaml
```

Use a short environment name such as `hourback-dev`. For `DatabaseUrlSecretArn`, provide a Secrets Manager secret ARN whose secret string is JSON with a `DATABASE_URL` field. Keep `LlmProvider` set to `mock` for an isolated deployment. Set it to `gemini` only after creating a Gemini secret with a `GEMINI_API_KEY` field and providing its ARN.

After deployment, attach the `GenerationProducerPolicyArn` output to the API's AWS identity and configure the API with the `GenerationQueueUrl` output. The worker's role only receives messages from this queue, acknowledges them, changes visibility when needed, and writes to its own CloudWatch log group.

## Runtime behavior

- The worker processes batches of up to five and reports individual failures to SQS.
- The queue waits seven minutes before redelivery and moves a message to the DLQ after five receives.
- A CloudWatch alarm tracks visible DLQ messages. Add a notification action in the target account if an alert is needed.
- The worker has bounded concurrency, SQS-managed encryption, and a 14-day log retention period.
- This stack does not deploy the GraphQL API or create a database. Run the existing migrations before sending jobs.

## Verification status

The SAM template and Docker build definition are source changes. They have not been deployed or exercised in AWS because no AWS account is configured for this project. The Google Cloud Pub/Sub smoke deployment is separate from this stack.
