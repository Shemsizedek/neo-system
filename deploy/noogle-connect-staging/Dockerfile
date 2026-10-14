FROM node:24-alpine
WORKDIR /app
COPY deploy/noogle-connect-staging/server.mjs ./server.mjs
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","server.mjs"]
