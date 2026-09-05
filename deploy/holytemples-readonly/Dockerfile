FROM node:24-alpine

WORKDIR /app

COPY server/holytemples-adapter ./server/holytemples-adapter

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

USER node

CMD ["node", "server/holytemples-adapter/server.mjs"]
