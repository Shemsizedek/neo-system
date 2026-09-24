FROM node:24-alpine
WORKDIR /app
COPY server/miner-generator ./server/miner-generator
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node","server/miner-generator/server.mjs"]
