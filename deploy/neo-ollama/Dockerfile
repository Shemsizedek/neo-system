FROM node:24-bookworm-slim AS node
FROM ollama/ollama:0.40.14
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /opt/neo
COPY server/neo-router ./server/neo-router
COPY deploy/neo-ollama ./deploy/neo-ollama
ENV OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_NO_CLOUD=1 \
    OLLAMA_CONTEXT_LENGTH=2048 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_KEEP_ALIVE=10m \
    OLLAMA_MODEL=qwen2.5:0.5b
EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/node", "deploy/neo-ollama/start.mjs"]
