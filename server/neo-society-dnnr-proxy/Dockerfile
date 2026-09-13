FROM node:22-alpine
WORKDIR /app
COPY server/neo-society-dnnr-proxy ./server/neo-society-dnnr-proxy
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server/neo-society-dnnr-proxy/server.mjs"]
