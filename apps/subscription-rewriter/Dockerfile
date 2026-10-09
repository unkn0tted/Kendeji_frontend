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
COPY apps/subscription-rewriter/src ./apps/subscription-rewriter/src
RUN bun build apps/subscription-rewriter/src/index.ts --compile --outfile /out/ppanel-subscription-rewriter

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV HOST=0.0.0.0 PORT=3003 CONFIG_FILE=/data/subscription-rewriter.json
COPY --from=build /out/ppanel-subscription-rewriter /ppanel-subscription-rewriter
VOLUME ["/data"]
EXPOSE 3003
ENTRYPOINT ["/ppanel-subscription-rewriter"]
