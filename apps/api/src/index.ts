import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors, { type CorsOptions } from 'cors';
import path from 'path';
import fs from 'fs';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { createLoaders } from './loaders';
import type { GraphQLContext } from './types/context';
import { hashSessionToken, sessionTokenFromCookie } from './auth/session';

import db from './db/client';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);
const configuredOrigins = new Set(
  (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isTrustedOrigin(req: express.Request, origin: string): boolean {
  if (configuredOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProtocol || req.protocol;
    return parsed.origin === `${protocol}://${req.get('host')}`;
  } catch {
    return false;
  }
}

async function bootstrap(): Promise<void> {
  const app = express();

  app.use(cors((req, callback) => {
    const origin = req.header('Origin');
    const options: CorsOptions = {
      origin: origin ? isTrustedOrigin(req, origin) : false,
      credentials: true,
    };
    callback(null, options);
  }));
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

  // SameSite cookies are the primary CSRF defense; reject cross-origin writes too.
  app.use('/graphql', (req, res, next) => {
    const origin = req.header('Origin');
    if (req.method === 'POST' && origin && !isTrustedOrigin(req, origin)) {
      res.status(403).json({ error: 'Untrusted request origin' });
      return;
    }
    next();
  });

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GraphQLContext> => {
        const sessionToken = sessionTokenFromCookie(req.headers.cookie);
        let teacherId: string | undefined;
        if (sessionToken) {
          const session = await db('auth_sessions')
            .where({ token_hash: hashSessionToken(sessionToken) })
            .where('expires_at', '>', db.fn.now())
            .first('teacher_id');
          teacherId = session?.teacher_id as string | undefined;
        }
        return {
          loaders: createLoaders(),
          teacherId,
          sessionToken,
          response: res,
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
