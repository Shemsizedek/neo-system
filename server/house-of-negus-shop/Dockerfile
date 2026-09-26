FROM node:24-alpine
WORKDIR /app
COPY server/house-of-negus-shop/server.mjs ./server.mjs
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node","server.mjs"]
