# Kendeji Frontend

This repository contains the PPanel-based admin and user websites, plus two extension services.
The production branch is `main`. The original PPanel backend and MySQL are deployed separately.

Protocol selection, default/recommended protocols, card/compact styles, subscription link
integration and hostname rewrite controls are included. See the
[complete integration guide (Chinese)](./custom-components-deployment.zh-CN.md).

## Build From a Clean Checkout

Install Node.js **24.18.0**, Bun **1.3.14**, and `tar` (Linux/macOS, or Windows WSL2).
With [mise](https://mise.jdx.dev/), `mise install` installs the pinned toolchains.

```bash
git clone https://github.com/unkn0tted/Kendeji_frontend.git
cd Kendeji_frontend
mise install
bun install --frozen-lockfile
bun run test
bun run package
```

Output: `apps/admin/dist`, `apps/user/dist`, `release/kendeji-admin.tar.gz`,
`release/kendeji-user.tar.gz`, and `release/SHA256SUMS`.
Each archive contains the website files directly, without a parent directory.
Use `bun run build` when archives are unnecessary.

## Deploy the Websites

Deploy each website to a separate site root. Configure Nginx SPA fallback with
`try_files $uri $uri/ /index.html`. Proxy `/v1/` to the existing PPanel backend,
preserving the path and Authorization header. This frontend has been used with
PPanel Server `1.20.3`; other versions must provide compatible APIs.

Connect the extension services by proxying `/protocol-config` to port 3002 and
`/subscription-rewriter/` to port 3003 on **both** frontend domains.
See the [Nginx example](../README.zh-CN.md#nginx-静态站点).

The current user app waits for the rewriter's public configuration before generating
subscription links. Keep the rewriter running even when rewriting is unused;
leave public URLs and rules empty to use direct subscription URLs.
The protocol service is needed to save custom selector settings.

For custom build configuration, copy each frontend's `.env.example` to `.env.local`:

- `VITE_API_BASE_URL`: original API origin; empty means same origin.
- `VITE_API_PREFIX`: optional prefix before `/v1`, such as `/api`.
- `VITE_PROTOCOL_CONFIG_BASE_URL`: optional protocol service origin.
- `VITE_SUBSCRIPTION_REWRITER_BASE_URL`: optional rewriter origin.
- `VITE_SHOW_LANDING_PAGE`: user app only; `false` redirects home to login.

These are public build-time values. Never put credentials into `VITE_*`.
Rebuild after changing them. The sidecar paths are unaffected by `VITE_API_PREFIX`.

## Docker Hub Services

Published images are **Linux amd64** and do not contain the frontend websites:

| Image | Purpose | Guide |
| --- | --- | --- |
| `unkn0tted/ppanel-protocol-config:1.0.4` | Protocol selector settings | [Deployment](../apps/protocol-config/README.md) |
| `unkn0tted/ppanel-subscription-rewriter:1.4.2` | Rewrite subscription node hostnames by subscription ID | [Deployment](../apps/subscription-rewriter/README.md) |

Inside either service directory, copy `.env.example` to `.env`, configure the
backend and database as applicable, then run `docker compose pull` and
`docker compose up -d`. No Node/Bun installation is required for deployment.
The rewriter requires a MySQL account with SELECT permission on `user_subscribe`
and the existing Docker network containing MySQL. A host-network alternative
is included for Linux hosts running MySQL directly.

The rewriter's origin subscription URL must point directly to the original backend.
Public subscription domains point to the rewriter, never the other way around.
Health endpoints only check that a service is running; verify admin saves and
real subscription output separately.

Both services store configuration in persistent named volumes. Back up the
configuration before upgrading; do not use `docker compose down -v`.
Pin image versions and use the previous version for rollback.

Build images directly from a clean checkout:

```bash
docker build -f apps/protocol-config/Dockerfile -t ppanel-protocol-config:local .
docker build -f apps/subscription-rewriter/Dockerfile -t ppanel-subscription-rewriter:local .
```

## Development and CI

Run `bun --filter ppanel-admin-web dev` (port 3001) or
`bun --filter ppanel-user-web dev` (port 3000) in separate terminals.
API proxies default to localhost:8080; extension services use ports 3002 and 3003.

GitHub Actions installs locked dependencies, runs tests, builds archives and
checks both Docker images. Download website archives from the run's Artifacts.
No automatic branch merges or Docker Hub publishing are performed.

This fork retains the upstream [GPL v3 license](../LICENSE) and copyright notices.
