FROM node:22-alpine AS exchange-build
WORKDIR /build/apps/neo-exchange
COPY apps/neo-exchange/package.json ./package.json
RUN npm install
COPY apps/neo-exchange ./
RUN npm run build -- --base=/

FROM node:22-alpine AS enterprise-build
WORKDIR /build
COPY server/neo-enterprise ./server/neo-enterprise
COPY registry/enterprise ./registry/enterprise
COPY scripts/build-enterprise-pages.mjs ./scripts/build-enterprise-pages.mjs
RUN node scripts/build-enterprise-pages.mjs

FROM node:22-alpine
WORKDIR /app
COPY server/holytemples-adapter ./server/holytemples-adapter
COPY server/neo-counter-backend/firestore-rest-db.mjs ./server/neo-counter-backend/firestore-rest-db.mjs
COPY server/neo-edge ./server/neo-edge
COPY server/neo-teller-backend ./server/neo-teller-backend
COPY api/neo-exchange ./api/neo-exchange
COPY apps/neo-relations/site ./apps/neo-relations/site
COPY apps/noogle/web/finance.html ./apps/noogle/web/finance.html
COPY public/neo-teller ./public/neo-teller
COPY public/neo-miner ./public/neo-miner
COPY public/guardian ./public/guardian
COPY public/api/identity/founder.json ./public/api/identity/founder.json
COPY docs/neo-enterprise ./docs/neo-enterprise
COPY docs/neo-pacer ./docs/neo-pacer
COPY docs/neo-lingo ./docs/neo-lingo
COPY docs/neo-corpus ./docs/neo-corpus
COPY docs/public-workspace ./docs/public-workspace
COPY apps/neo-realty/web ./apps/neo-realty/web
COPY public/neo-generator ./public/neo-generator
COPY data/neo-pacer ./data/neo-pacer
COPY public/platform-shell.css ./public/platform-shell.css
COPY public/platform-shell.js ./public/platform-shell.js
COPY --from=exchange-build /build/apps/neo-exchange/dist ./apps/neo-exchange/dist
COPY --from=enterprise-build /build/dist/api/enterprise ./dist/api/enterprise
ENV NODE_ENV=production
ENV PORT=8080
ENV NEO_PLATFORM_API_ORIGIN=https://egov.holytemples.org
ENV NEO_EXCHANGE_ALLOWED_ORIGIN=https://neofx.holytemples.org
ENV COUNTERPARTY_API_URL=https://api.counterparty.io:4000
ENV BITCOIN_ELECTRS_URL=https://blockstream.info/api
EXPOSE 8080
CMD ["node", "server/neo-edge/production.mjs"]
