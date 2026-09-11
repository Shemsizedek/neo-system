FROM node:22-alpine
WORKDIR /app
COPY server/holytemples-adapter ./server/holytemples-adapter
COPY server/neo-edge ./server/neo-edge
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/neo-edge/server.mjs"]
