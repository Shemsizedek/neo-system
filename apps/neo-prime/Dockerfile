FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY core/neo-algo ./core/neo-algo
COPY server/neo-router ./server/neo-router
COPY server/neo-prime ./server/neo-prime

EXPOSE 8080
CMD ["node", "server/neo-prime/server.mjs"]
