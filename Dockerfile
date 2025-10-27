FROM node:20-alpine

WORKDIR /app

# Install dependencies (includes devDependencies required by scripts)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Ensure the watcher runs under CommonJS despite package.json "type": "module"
RUN cp scripts/usdog-liquidation-watcher.js scripts/usdog-liquidation-watcher.cjs || true

ENV NODE_ENV=production

# This is a worker container; no ports are exposed
CMD ["node", "scripts/usdog-liquidation-watcher.cjs"]

