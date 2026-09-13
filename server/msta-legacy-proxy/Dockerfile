FROM node:22-alpine
WORKDIR /app
COPY server/msta-legacy-proxy/server.mjs ./server.mjs
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
