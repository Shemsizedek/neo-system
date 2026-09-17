FROM node:22-alpine AS exchange-build
WORKDIR /build/apps/neo-exchange
COPY apps/neo-exchange/package.json ./package.json
RUN npm install
COPY apps/neo-exchange ./
RUN npm run build -- --base=/

FROM node:22-alpine
WORKDIR /app
COPY server/holytemples-adapter ./server/holytemples-adapter
COPY server/neo-counter-backend/firestore-rest-db.mjs ./server/neo-counter-backend/firestore-rest-db.mjs
COPY server/neo-edge ./server/neo-edge
COPY api/neo-exchange ./api/neo-exchange
COPY apps/neo-relations/site ./apps/neo-relations/site
COPY --from=exchange-build /build/apps/neo-exchange/dist ./apps/neo-exchange/dist
ENV NODE_ENV=production
ENV PORT=8080
ENV NEO_PLATFORM_API_ORIGIN=https://egov.holytemples.org
ENV NEO_EXCHANGE_ALLOWED_ORIGIN=https://neofx.holytemples.org
EXPOSE 8080
CMD ["node", "server/neo-edge/production.mjs"]
