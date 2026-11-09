FROM node:24-alpine
WORKDIR /app
COPY core/nous-os/ /app/core/nous-os/
USER node
ENV NODE_ENV=production NOUS_HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["node", "core/nous-os/server.mjs"]
