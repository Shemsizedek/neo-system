FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node core/nous-os/ /app/core/nous-os/
# Only source contracts are bundled: Nous cannot execute the source TypeScript here.
COPY --chown=node:node registry/agents.yaml /app/registry/agents.yaml
COPY --chown=node:node src/noology/neoAlgo.ts /app/src/noology/neoAlgo.ts
COPY --chown=node:node src/noology/nousEconomicValueKernel.ts /app/src/noology/nousEconomicValueKernel.ts
RUN mkdir -p /app/state && chown node:node /app/state
USER node
ENV NODE_ENV=production NOUS_HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["node", "core/nous-os/server.mjs"]
