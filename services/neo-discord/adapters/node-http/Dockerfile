FROM node:24-alpine
WORKDIR /app
COPY services/neo-discord ./services/neo-discord
COPY server/neo-bots ./server/neo-bots
WORKDIR /app/services/neo-discord/adapters/node-http
RUN npm install --omit=dev
ENV NODE_ENV=production
ENV PORT=8788
EXPOSE 8788
CMD ["npm","start"]
