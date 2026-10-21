import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { createLoaders } from './loaders';
import type { GraphQLContext } from './types/context';

import db from './db/client';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

async function bootstrap(): Promise<void> {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer<GraphQLContext>({
    schema,
    introspection: process.env['NODE_ENV'] !== 'production',
    formatError: (formattedError) => {
      // Never leak internal stack traces to clients
      if (process.env['NODE_ENV'] === 'production') {
        return { message: formattedError.message, extensions: { code: formattedError.extensions?.['code'] } };
      }
      return formattedError;
    },
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => {
        let teacherId = req.headers['x-teacher-id'] as string | undefined;
        if (!teacherId) {
          const firstTeacher = await db('teachers').first();
          teacherId = firstTeacher?.id;
        }
        return {
          loaders: createLoaders(),
          teacherId,
        };
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // In production (e.g. Cloud Run), serve the compiled React SPA
  const webDistPath = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/graphql') || req.path === '/health') return next();
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.warn(`HourBack API ready at http://localhost:${PORT}/graphql`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
