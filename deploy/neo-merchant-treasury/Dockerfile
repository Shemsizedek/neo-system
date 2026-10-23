FROM node:24-alpine
WORKDIR /app
COPY server/neo-merchant-treasury ./server/neo-merchant-treasury
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-merchant-treasury/server.mjs"]
