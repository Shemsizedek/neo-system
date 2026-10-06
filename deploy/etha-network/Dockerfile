FROM node:24-slim
WORKDIR /app
COPY server/etha-network /app
USER 65532:65532
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","server.mjs"]
