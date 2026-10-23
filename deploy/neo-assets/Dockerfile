FROM node:24-alpine
WORKDIR /app
COPY server/neo-assets ./server/neo-assets
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-assets/server.mjs"]
