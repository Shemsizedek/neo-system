FROM node:24-slim
WORKDIR /app
COPY apps/orange-esop/package.json ./package.json
RUN npm install --omit=dev
COPY modules/orange-esop ./modules/orange-esop
COPY apps/orange-esop ./apps/orange-esop
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node","apps/orange-esop/server/production.mjs"]
