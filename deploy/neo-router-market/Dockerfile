FROM node:24-alpine
WORKDIR /app
COPY server/neo-router-market ./server/neo-router-market
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-router-market/server.mjs"]
