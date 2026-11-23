FROM node:22-alpine AS build
WORKDIR /build/apps/neo-exchange
COPY apps/neo-exchange/package.json ./
RUN npm install --no-audit --no-fund
COPY apps/neo-exchange ./
RUN npm run build -- --base=/

FROM node:22-alpine
WORKDIR /app
COPY server/neofx/dedicated.mjs ./server/neofx/dedicated.mjs
COPY server/markets ./server/markets
COPY api/neo-exchange ./api/neo-exchange
COPY --from=build /build/apps/neo-exchange/dist ./apps/neo-exchange/dist
ENV NODE_ENV=production
ENV PORT=8080
ENV NEO_FX_LIVE_TRADING=false
EXPOSE 8080
CMD ["node","server/neofx/dedicated.mjs"]
