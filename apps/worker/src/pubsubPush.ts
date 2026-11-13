import type { IncomingMessage, ServerResponse } from 'node:http';
import { GenerationMessageSchema } from '@hourback/shared';
import type { GenerationMessage } from '@hourback/shared';
import { z } from 'zod';
import { processMessageData } from './handler';

const pushEnvelope = z.object({
  subscription: z.string(),
  deliveryAttempt: z.number().int().positive().optional(),
  message: z.object({ messageId: z.string().min(1), data: z.string().min(1) }),
});

interface Delivery {
  messageId: string;
  deliveryAttempt?: number;
}

interface PushOptions {
  subscription: string;
  process?: (message: GenerationMessage, delivery: Delivery) => Promise<void>;
  log?: (delivery: Delivery, outcome: 'accepted' | 'retry' | 'invalid') => void;
}

async function readEnvelope(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 32_768) throw new Error('Push envelope too large.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function decodeMessage(data: string): GenerationMessage {
  const decoded = Buffer.from(data, 'base64');
  if (decoded.toString('base64') !== data) throw new Error('Invalid Pub/Sub base64 data.');
  return GenerationMessageSchema.parse(JSON.parse(decoded.toString('utf8')));
}

function logDelivery(delivery: Delivery, outcome: 'accepted' | 'retry' | 'invalid'): void {
  // eslint-disable-next-line no-console
  console.info(JSON.stringify({ event: 'hourback_pubsub_delivery', ...delivery, outcome }));
}

export function createPubSubPushHandler({
  subscription,
  process = processMessageData,
  log = logDelivery,
}: PushOptions) {
  if (!/^projects\/[^/]+\/subscriptions\/[^/]+$/.test(subscription)) {
    throw new Error('PUBSUB_PUSH_SUBSCRIPTION must be a full subscription resource name.');
  }

  // Cloud Run IAM authenticates requests before they reach this handler.
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    let envelope: z.infer<typeof pushEnvelope>;
    try {
      envelope = pushEnvelope.parse(await readEnvelope(request));
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (envelope.subscription !== subscription) {
      response.writeHead(403).end();
      return;
    }

    const delivery = {
      messageId: envelope.message.messageId,
      deliveryAttempt: envelope.deliveryAttempt,
    };
    let message: GenerationMessage;
    try {
      message = decodeMessage(envelope.message.data);
    } catch {
      log(delivery, 'invalid');
      response.writeHead(400).end();
      return;
    }

    try {
      await process(message, delivery);
    } catch {
      log(delivery, 'retry');
      response.writeHead(503).end();
      return;
    }
    log(delivery, 'accepted');
    response.writeHead(204).end();
  };
}
