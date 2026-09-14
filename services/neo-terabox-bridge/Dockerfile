FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY manifest.json ./manifest.json
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
