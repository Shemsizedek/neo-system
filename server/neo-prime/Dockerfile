FROM node:24-alpine
WORKDIR /app
COPY core ./core
COPY server/neo-router ./server/neo-router
COPY server/neo-prime ./server/neo-prime
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/neo-prime/server.mjs"]
