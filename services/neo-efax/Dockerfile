# Northflank-eligible isolated API image. No carrier code or credentials included.
# Use build context: services/neo-efax; Dockerfile path: services/neo-efax/Dockerfile.
FROM node:24-alpine
ENV NODE_ENV=production PORT=10000
WORKDIR /app
COPY --chown=node:node server.cjs ./server.cjs
USER node
# No EXPOSE directive: set port 10000 to PRIVATE manually on the staging platform.
CMD ["node", "server.cjs"]
