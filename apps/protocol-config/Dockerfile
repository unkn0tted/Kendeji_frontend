FROM debian:bookworm-slim

ENV PORT=3002
ENV CONFIG_FILE=/data/protocol-config.json

COPY apps/protocol-config/dist/ppanel-protocol-config /ppanel-protocol-config

RUN chmod +x /ppanel-protocol-config

VOLUME ["/data"]
EXPOSE 3002

ENTRYPOINT ["/ppanel-protocol-config"]
