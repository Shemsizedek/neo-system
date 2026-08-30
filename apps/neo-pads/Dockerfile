FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=optional

COPY tsconfig.json ./
COPY src ./src
COPY config ./config
COPY contracts ./contracts
COPY db ./db

EXPOSE 8788
CMD ["npm", "start"]
