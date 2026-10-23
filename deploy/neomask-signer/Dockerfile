FROM node:24-alpine
WORKDIR /app
COPY server/neomask-signer ./server/neomask-signer
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node","server/neomask-signer/server.mjs"]
