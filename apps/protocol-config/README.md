# 协议配置服务

保存用户端的协议列表、默认协议、推荐协议和选择器样式。
管理端保存时使用现有登录 `Authorization`，通过原 PPanel 的
`/v1/admin/user/current` 验证管理员。不修改原后端或数据库。

已发布镜像：[unkn0tted/ppanel-protocol-config:1.0.4](https://hub.docker.com/r/unkn0tted/ppanel-protocol-config)，Linux amd64。

## 使用 Docker Hub 镜像

从仓库根目录执行：

```bash
cd apps/protocol-config
cp .env.example .env
# 编辑 .env，设置容器能访问的原 PPanel 后端地址
docker compose pull
docker compose up -d
curl --fail http://127.0.0.1:3002/health
curl --fail http://127.0.0.1:3002/protocol-config
```

`PPANEL_API_BASE` 示例为 `https://api.example.com`，
或宿主机可达的 `http://host.docker.internal:8080`。
原后端仅监听宿主机 loopback 时，普通 bridge 容器无法访问它，
应使用可达的后端域名，或配置同网络内的后端服务。
服务名 `ppanel-server` 只有在容器处于相同 Docker 网络时才能解析。

Compose 将服务端口绑定到宿主机 `127.0.0.1`，由宿主机 Nginx 反代。
配置文件保存在命名 volume `ppanel-protocol-config-data` 的
`/data/protocol-config.json`，重建容器不会丢失。

## 前端反代

在管理端和用户端站点的 Nginx `server {}` 中都添加：

```nginx
location = /protocol-config {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}
```

保留原 PPanel API 反代，执行 `nginx -t` 后重载。
前端默认访问同源 `/protocol-config`；独立域名部署时，在两个前端构建前设置
`VITE_PROTOCOL_CONFIG_BASE_URL=https://config.example.com`，并配置服务的 `CORS_ORIGIN`。
容器化 Nginx 请改为能访问此服务的地址。

## 环境变量

| 变量 | 默认值 / 用途 |
| --- | --- |
| `PORT` | `3002`，容器内端口 |
| `CONFIG_FILE` | `/data/protocol-config.json` |
| `PPANEL_API_BASE` | 必填，原后端地址，用于验证管理员 |
| `PPANEL_ADMIN_CURRENT_PATH` | `/v1/admin/user/current` |
| `CORS_ORIGIN` | `*`，允许的跨域来源 |
| `PROTOCOL_CONFIG_IMAGE_TAG` | Compose 使用的镜像版本，默认 `1.0.4` |
| `PROTOCOL_CONFIG_PORT` | Compose 使用的宿主机端口，默认 `3002` |

## 接口与配置

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/health` | 公开，服务存活检查 |
| GET | `/protocol-config` | 公开，读取配置 |
| PUT | `/protocol-config` | 管理员，保存配置 |

返回数据包含 `default_protocol`、`recommended_protocol`、
`selector_style`（`cards` 或 `compact`）和 `protocol_options`。
每个协议选项包含 `value`、`label`、`description`、`icon`、`enabled`。
`value` 写入订阅链接的 `protocol` 参数，例如 `tuic`。
公开 GET 允许缓存 30 秒；保存请求和错误响应不缓存。

## 从源码构建

从仓库根目录执行，无需本机 Node/Bun，也无需已有编译产物：

```bash
docker build -f apps/protocol-config/Dockerfile -t ppanel-protocol-config:local .
```

或者 `docker compose -f apps/protocol-config/docker-compose.example.yml build`。
使用本地镜像运行时，沿用生产 Compose 的环境变量和 volume，
将 `image` 替换为 `ppanel-protocol-config:local`。

发布新版本到自己的 Docker Hub 仓库：

```bash
docker login
DOCKERHUB_REPO=yourname/ppanel-protocol-config \
VERSION=1.0.5 \
./scripts/publish-protocol-config-image.sh
```

默认仅推送指定版本，`PUSH_LATEST=true` 可额外更新 `latest`。
不要覆盖已发布的固定版本。使用已配置 QEMU/native builders 的 Buildx，
可设置 `PLATFORMS=linux/amd64,linux/arm64` 在容器内分别编译。
目前仓库已发布的 `1.0.4` 仍只支持 amd64。

## 开发、升级与备份

本地源码运行：

```bash
bun install --frozen-lockfile
CONFIG_FILE=/tmp/protocol-config.json \
PPANEL_API_BASE=http://localhost:8080 \
bun --filter ppanel-protocol-config-service dev
```

升级或回滚：修改 `.env` 的 `PROTOCOL_CONFIG_IMAGE_TAG`，
执行 `docker compose pull && docker compose up -d`，然后检查健康接口和日志。
`/health` 只检查服务存活，不代表原后端管理员验证成功，需实际登录管理端保存一次验证。

备份配置（文件首次保存后才存在）：

```bash
docker compose cp protocol-config:/data/protocol-config.json ./protocol-config.backup.json
```

恢复时把备份复制回容器，再重启服务：

```bash
docker compose cp ./protocol-config.backup.json protocol-config:/data/protocol-config.json
docker compose restart
```

不要删除数据 volume 或执行 `docker compose down -v`。
