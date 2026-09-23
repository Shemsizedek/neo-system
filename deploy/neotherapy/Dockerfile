FROM node:24-alpine
WORKDIR /app
COPY server/neotherapy ./server/neotherapy
COPY server/neo-counter-backend/firestore-rest-db.mjs ./server/neo-counter-backend/firestore-rest-db.mjs
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node","server/neotherapy/server.mjs"]
