FROM node:24-alpine
WORKDIR /app
COPY architecture/neo-sovereign-identity-policy.json ./architecture/neo-sovereign-identity-policy.json
COPY server/neo-pki ./server/neo-pki
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-pki/server.mjs"]
