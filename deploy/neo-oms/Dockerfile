FROM node:24-alpine
WORKDIR /app
COPY server/neo-oms ./server/neo-oms
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-oms/server.mjs"]
