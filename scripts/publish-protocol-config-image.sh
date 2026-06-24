#!/usr/bin/env bash
set -euo pipefail

IMAGE_REPO="${DOCKERHUB_REPO:-}"
VERSION="${VERSION:-}"
PLATFORMS="${PLATFORMS:-}"
PUSH_LATEST="${PUSH_LATEST:-true}"
PUSH_RETRIES="${PUSH_RETRIES:-5}"
PUSH_RETRY_DELAY="${PUSH_RETRY_DELAY:-8}"

if [[ -z "$IMAGE_REPO" ]]; then
  echo "DOCKERHUB_REPO is required, for example: DOCKERHUB_REPO=yourname/ppanel-protocol-config" >&2
  exit 1
fi

if [[ -z "$VERSION" ]]; then
  VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -n 1)"
fi

if [[ -z "$VERSION" ]]; then
  echo "VERSION is empty. Set VERSION=1.0.0 or keep package.json version valid." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not reachable from this shell." >&2
  echo "Try running this script with sudo, or add your user to the docker group and reopen the shell:" >&2
  echo "  sudo usermod -aG docker $USER" >&2
  exit 1
fi

VERSION_TAG="${IMAGE_REPO}:${VERSION}"
LATEST_TAG="${IMAGE_REPO}:latest"

echo "Publishing protocol config image"
echo "Repository: ${IMAGE_REPO}"
echo "Version:    ${VERSION}"
echo "Latest:     ${PUSH_LATEST}"

retry_docker_push() {
  local tag="$1"
  local attempt=1

  while true; do
    if docker push "$tag"; then
      return 0
    fi

    if (( attempt >= PUSH_RETRIES )); then
      echo "docker push failed after ${PUSH_RETRIES} attempts: ${tag}" >&2
      return 1
    fi

    echo "docker push failed for ${tag}; retrying in ${PUSH_RETRY_DELAY}s (${attempt}/${PUSH_RETRIES})..." >&2
    sleep "$PUSH_RETRY_DELAY"
    attempt=$((attempt + 1))
  done
}

bun --filter ppanel-protocol-config-service build:binary

if [[ ! -f "apps/protocol-config/dist/ppanel-protocol-config" ]]; then
  echo "Compiled binary was not found at apps/protocol-config/dist/ppanel-protocol-config" >&2
  exit 1
fi

if [[ -n "$PLATFORMS" ]]; then
  if [[ "$PLATFORMS" != "linux/amd64" ]]; then
    echo "PLATFORMS=${PLATFORMS} is not supported by the local binary build path." >&2
    echo "Build the target binary on each architecture, or switch Dockerfile back to a multi-stage base-image build." >&2
    exit 1
  fi

  echo "Platforms:  ${PLATFORMS}"
  TAG_ARGS=(-t "$VERSION_TAG")
  if [[ "$PUSH_LATEST" == "true" ]]; then
    TAG_ARGS+=(-t "$LATEST_TAG")
  fi

  docker buildx build \
    --platform "$PLATFORMS" \
    "${TAG_ARGS[@]}" \
    -f apps/protocol-config/Dockerfile \
    --push \
    .
else
  docker build \
    -f apps/protocol-config/Dockerfile \
    -t "$VERSION_TAG" \
    .

  retry_docker_push "$VERSION_TAG"

  if [[ "$PUSH_LATEST" == "true" ]]; then
    docker tag "$VERSION_TAG" "$LATEST_TAG"
    retry_docker_push "$LATEST_TAG"
  fi
fi

echo "Published ${VERSION_TAG}"
if [[ "$PUSH_LATEST" == "true" ]]; then
  echo "Published ${LATEST_TAG}"
fi
