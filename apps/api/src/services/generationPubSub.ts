import { PubSub } from '@google-cloud/pubsub';
import type { Topic } from '@google-cloud/pubsub';
import type { GenerationMessage } from '@hourback/shared';

let topic: Topic | undefined;

export function generationPubSubTopic(): Topic | undefined {
  const name = process.env['PUBSUB_GENERATION_TOPIC']?.trim();
  if (!name || process.env['USE_LOCAL_QUEUE'] === 'true') return undefined;

  if (!topic) {
    const projectId = /^projects\/([^/]+)\/topics\/([^/]+)$/.exec(name)?.[1];
    if (!projectId) throw new Error('PUBSUB_GENERATION_TOPIC must be a full topic resource name.');
    topic = new PubSub({ projectId }).topic(name);
  }
  return topic;
}

export async function publishGenerationMessage(
  target: Topic,
  message: GenerationMessage,
): Promise<string> {
  return target.publishMessage({ data: Buffer.from(JSON.stringify(message)) });
}
