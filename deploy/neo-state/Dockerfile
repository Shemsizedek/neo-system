FROM node:24-alpine
WORKDIR /app
COPY architecture/neo-state-fabric-policy.json ./architecture/neo-state-fabric-policy.json
COPY server/neo-state ./server/neo-state
ENV NODE_ENV=production PORT=8080 NEO_STATE_MODE=FIRESTORE_PRIMARY
USER node
EXPOSE 8080
CMD ["node","server/neo-state/server.mjs"]
