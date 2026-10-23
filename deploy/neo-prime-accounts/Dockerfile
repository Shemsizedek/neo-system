FROM node:24-alpine
WORKDIR /app
COPY server/neo-prime-accounts ./server/neo-prime-accounts
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-prime-accounts/server.mjs"]
