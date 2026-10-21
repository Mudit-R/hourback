# ─── Runtime-only image — pre-built dist folders are copied directly ───────
# Build locally first: npm run build
# Then deploy: gcloud run deploy --source .
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy root manifest (needed for workspaces resolution)
COPY package*.json ./

# Copy each package manifest so npm install resolves workspace deps
COPY packages/shared/package.json ./packages/shared/
COPY packages/llm/package.json    ./packages/llm/
COPY apps/worker/package.json     ./apps/worker/
COPY apps/api/package.json        ./apps/api/
COPY apps/web/package.json        ./apps/web/

# Install ONLY production dependencies (no dev toolchain)
RUN npm ci --omit=dev --ignore-scripts

# Copy pre-built dist artifacts (built locally via `npm run build`)
COPY packages/shared/dist ./packages/shared/dist
COPY packages/llm/dist    ./packages/llm/dist
COPY apps/worker/dist     ./apps/worker/dist
COPY apps/api/dist        ./apps/api/dist
COPY apps/web/dist        ./apps/web/dist

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
