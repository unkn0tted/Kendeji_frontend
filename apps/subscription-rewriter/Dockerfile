FROM debian:bookworm-slim

ENV HOST=0.0.0.0
ENV PORT=3003
ENV CONFIG_FILE=/data/subscription-rewriter.json

COPY apps/subscription-rewriter/dist/ppanel-subscription-rewriter /ppanel-subscription-rewriter

RUN chmod +x /ppanel-subscription-rewriter

VOLUME ["/data"]
EXPOSE 3003

ENTRYPOINT ["/ppanel-subscription-rewriter"]
