FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/miner-cloud-run-readonly/server.mjs ./server.mjs
USER node
EXPOSE 8080
CMD ["node","server.mjs"]
