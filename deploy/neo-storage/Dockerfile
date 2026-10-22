FROM node:24-alpine
WORKDIR /app
COPY architecture/neo-storage-fabric-policy.json ./architecture/neo-storage-fabric-policy.json
COPY server/neo-storage ./server/neo-storage
RUN mkdir -p /app/data/neo-storage && chown -R node:node /app/data
ENV NODE_ENV=production PORT=8080 NEO_STORAGE_ROOT=/app/data/neo-storage
USER node
EXPOSE 8080
CMD ["node","server/neo-storage/server.mjs"]
