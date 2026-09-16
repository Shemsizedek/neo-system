FROM node:24-alpine
WORKDIR /app
COPY server/neoguard-control-plane ./server/neoguard-control-plane
USER node
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node","server/neoguard-control-plane/index.mjs"]
