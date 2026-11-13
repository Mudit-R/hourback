FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/llm/package.json ./packages/llm/
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --omit=dev --ignore-scripts

COPY packages/shared/dist ./packages/shared/dist
COPY packages/llm/dist ./packages/llm/dist
COPY apps/worker/dist ./apps/worker/dist
COPY apps/api/dist ./apps/api/dist
COPY scripts/pubsub-smoke-server.cjs ./scripts/

USER node
EXPOSE 8080
CMD ["node", "scripts/pubsub-smoke-server.cjs"]
