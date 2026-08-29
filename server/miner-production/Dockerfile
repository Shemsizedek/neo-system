FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/miner-production ./server/miner-production
RUN mkdir -p /var/lib/neo-miner && chown -R node:node /app /var/lib/neo-miner
USER node

FROM base AS production
EXPOSE 8890
ENV PORT=8890 NEO_MINER_DB_PATH=/var/lib/neo-miner/neo-miner.sqlite
VOLUME ["/var/lib/neo-miner"]
CMD ["node","server/miner-production/start.mjs"]

FROM base AS operator
EXPOSE 8891
ENV NEO_OPERATOR_PORT=8891
CMD ["node","server/miner-production/operatorControlPlane.mjs"]
