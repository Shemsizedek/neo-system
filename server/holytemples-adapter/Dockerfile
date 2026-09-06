FROM node:22-alpine
WORKDIR /app
COPY server/holytemples-adapter ./server/holytemples-adapter
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server/holytemples-adapter/server.mjs"]
