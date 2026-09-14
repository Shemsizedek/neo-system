FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server.mjs manifest.json ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
