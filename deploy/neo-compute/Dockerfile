FROM node:24-alpine
WORKDIR /app
COPY server/neo-compute ./server/neo-compute
ENV NODE_ENV=production
ENV PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-compute/server.mjs"]
