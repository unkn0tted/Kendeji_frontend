FROM oven/bun:1.3.14 AS build
WORKDIR /src
COPY package.json bun.lock bunfig.toml ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/user/package.json ./apps/user/package.json
COPY apps/protocol-config/package.json ./apps/protocol-config/package.json
COPY apps/subscription-rewriter/package.json ./apps/subscription-rewriter/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY docs/package.json ./docs/package.json
RUN bun install --frozen-lockfile --ignore-scripts
COPY apps/protocol-config/src ./apps/protocol-config/src
RUN bun build apps/protocol-config/src/index.ts --compile --outfile /out/ppanel-protocol-config

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV HOST=0.0.0.0 PORT=3002 CONFIG_FILE=/data/protocol-config.json
COPY --from=build /out/ppanel-protocol-config /ppanel-protocol-config
VOLUME ["/data"]
EXPOSE 3002
ENTRYPOINT ["/ppanel-protocol-config"]
