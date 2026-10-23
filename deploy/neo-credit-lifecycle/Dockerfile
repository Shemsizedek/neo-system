FROM node:24-alpine
WORKDIR /app
COPY server/neo-credit-lifecycle ./server/neo-credit-lifecycle
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-credit-lifecycle/server.mjs"]
