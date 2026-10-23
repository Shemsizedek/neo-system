FROM node:24-alpine
WORKDIR /app
COPY server/neo-economics ./server/neo-economics
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-economics/server.mjs"]
