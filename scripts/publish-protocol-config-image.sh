#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DOCKERHUB_REPO:?Set DOCKERHUB_REPO, for example yourname/ppanel-protocol-config}"
: "${VERSION:?Set a new VERSION; do not overwrite an existing release}"

tags=(-t "${DOCKERHUB_REPO}:${VERSION}")
if [[ "${PUSH_LATEST:-false}" == "true" ]]; then
  tags+=(-t "${DOCKERHUB_REPO}:latest")
fi

docker buildx build \
  --platform "${PLATFORMS:-linux/amd64}" \
  "${tags[@]}" \
  -f apps/protocol-config/Dockerfile \
  --push .
