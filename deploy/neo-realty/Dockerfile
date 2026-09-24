FROM node:24-alpine
WORKDIR /app
COPY apps/neo-realty/package.json ./package.json
RUN npm install --omit=dev=false
COPY apps/neo-realty ./
ENV NODE_ENV=production
ENV PORT=8080
ENV NEO_REALTY_REQUIRE_PERSISTENCE=true
EXPOSE 8080
CMD ["sh","-c","npm run db:migrate && npm start"]
