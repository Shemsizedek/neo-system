FROM node:24-alpine
WORKDIR /app
COPY server/wordpress-stewardship ./server/wordpress-stewardship
ENV PORT=8791
EXPOSE 8791
CMD ["node", "server/wordpress-stewardship/gateway.mjs"]
