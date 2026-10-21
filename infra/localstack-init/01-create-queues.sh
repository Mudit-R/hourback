#!/usr/bin/env bash
# infra/localstack-init/01-create-queues.sh
# Runs automatically when LocalStack is ready (mounted into ready.d/)

set -euo pipefail

echo "Creating SQS queues..."

# Dead Letter Queue first
awslocal sqs create-queue \
  --queue-name hourback-comments-dlq \
  --attributes '{"MessageRetentionPeriod":"1209600"}'

DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/hourback-comments-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "DLQ ARN: $DLQ_ARN"

# Main queue with redrive policy (3 receives → DLQ)
awslocal sqs create-queue \
  --queue-name hourback-comments \
  --attributes "{
    \"VisibilityTimeout\": \"300\",
    \"MessageRetentionPeriod\": \"86400\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }"

echo "SQS queues created successfully."
