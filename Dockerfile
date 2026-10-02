FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm build

FROM node:24-slim AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/app/data/projects.db
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/server/package.json apps/server/package.json
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/client/dist apps/client/dist
RUN pnpm install --prod --filter server --frozen-lockfile=false
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["pnpm", "--filter", "server", "start"]
