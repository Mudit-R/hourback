FROM node:20-bookworm-slim AS build

WORKDIR /workspace
COPY . .

RUN npm ci \
    && npm run build --workspace=@hourback/shared \
    && npm run build --workspace=@hourback/llm \
    && npm run build --workspace=@hourback/worker \
    && npm prune --omit=dev

FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /workspace/apps/worker/dist ./apps/worker/dist
COPY --from=build /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=build /workspace/packages/llm/package.json ./packages/llm/package.json
COPY --from=build /workspace/packages/llm/dist ./packages/llm/dist

CMD ["apps/worker/dist/handler.handler"]
