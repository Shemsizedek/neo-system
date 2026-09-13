FROM node:24-alpine
WORKDIR /app
COPY server/neo-opal-bridge ./server/neo-opal-bridge
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/neo-opal-bridge/server.mjs"]
