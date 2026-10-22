FROM node:24-alpine
WORKDIR /app
COPY architecture/neo-secrets-fabric-policy.json ./architecture/neo-secrets-fabric-policy.json
COPY server/neo-secrets ./server/neo-secrets
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-secrets/server.mjs"]
