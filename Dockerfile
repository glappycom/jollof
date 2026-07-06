# Jollof IDE — production image (browser IDE + local server API)
# Build: docker build -t jollof-ide .
# Run:   docker run -p 8080:8080 -p 31337:31337 jollof-ide

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# node-pty native deps on Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV JOLLOF_PORT=31337
ENV JOLLOF_CWD=/app
ENV STATIC_PORT=8080

EXPOSE 8080 31337

COPY scripts/docker-entrypoint.mjs ./scripts/docker-entrypoint.mjs
CMD ["node", "scripts/docker-entrypoint.mjs"]
