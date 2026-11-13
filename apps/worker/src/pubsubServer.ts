import { createServer } from 'node:http';
import { createPubSubPushHandler } from './pubsubPush';

if (!process.env['DATABASE_URL']) throw new Error('DATABASE_URL is required for the push worker.');
const push = createPubSubPushHandler({
  subscription: process.env['PUBSUB_PUSH_SUBSCRIPTION'] ?? '',
});

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200).end('ok');
  } else if (request.method === 'POST' && request.url === '/pubsub/push') {
    void push(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(503);
      response.end();
    });
  } else {
    response.writeHead(404).end();
  }
});
server.listen(Number(process.env['PORT'] ?? 8080), '0.0.0.0');
