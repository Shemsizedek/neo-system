FROM node:24-alpine
WORKDIR /app
COPY server/neo-credit-reporting ./server/neo-credit-reporting
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neo-credit-reporting/server.mjs"]
