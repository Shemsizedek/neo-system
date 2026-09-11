FROM node:24-alpine AS deps
WORKDIR /app/server/neo-bank
COPY server/neo-bank/package.json ./package.json
RUN npm install --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=deps /app/server/neo-bank/node_modules ./server/neo-bank/node_modules
COPY server/neo-bank ./server/neo-bank
EXPOSE 8080
CMD ["node","server/neo-bank/production.mjs"]
