# PPanel Protocol Config Service

这是一个独立于现有 PPanel 后端的小后端，用来保存用户端“订阅协议选择器”的配置。它适合部署成单独容器，然后通过 Nginx 反代到前端同域名下。

它不会修改现有后端代码，只会在管理端保存配置时，拿当前管理端登录态去现有后端校验一次管理员身份。

## 功能

保存并返回下面这些字段：

| 字段 | 可选值 | 说明 |
| --- | --- | --- |
| `default_protocol` | 任意启用的 `protocol_options[].value` | 用户端默认选中的协议 |
| `recommended_protocol` | 任意启用的 `protocol_options[].value` | 用户端标记为推荐的协议 |
| `selector_style` | `cards`, `compact` | 用户端协议选择器展示样式 |
| `protocol_options` | 数组 | 用户端可选择的协议列表 |

`protocol_options` 每一项支持：

| 字段 | 说明 |
| --- | --- |
| `value` | 写入订阅链接的协议参数，例如最终生成 `protocol=tuic` |
| `label` | 用户端按钮显示名称 |
| `description` | 用户端按钮下方说明文字 |
| `icon` | Iconify 图标名，例如 `mdi:connection` |
| `enabled` | 是否在用户端显示 |

接口：

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/protocol-config` | 公开 | 用户端和管理端读取配置 |
| `PUT` | `/protocol-config` | 需要管理端 `Authorization` | 管理端保存配置 |
| `GET` | `/health` | 公开 | 健康检查 |

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3002` | 服务监听端口 |
| `CONFIG_FILE` | `/data/protocol-config.json` | 配置文件保存位置 |
| `PPANEL_API_BASE` | 空 | 现有 PPanel 后端地址，用来校验管理员 token |
| `PPANEL_ADMIN_CURRENT_PATH` | `/v1/admin/user/current` | 管理员校验接口路径 |
| `CORS_ORIGIN` | `*` | 跨域来源；同域反代时通常不用改 |

`PPANEL_API_BASE` 示例：

- 同一个 Docker 网络：`http://ppanel-server:8080`
- 后端只暴露在宿主机端口：`http://host.docker.internal:8080`
- 独立后端域名：`https://api.example.com`

## 本地开发

在仓库根目录安装依赖：

```bash
bun install
```

启动小后端：

```bash
cd apps/protocol-config
PORT=3002 \
CONFIG_FILE=/tmp/ppanel-protocol-config.json \
PPANEL_API_BASE=http://localhost:8080 \
bun run dev
```

读取配置：

```bash
curl http://localhost:3002/protocol-config
```

保存配置需要带管理端 `Authorization`：

```bash
curl -X PUT http://localhost:3002/protocol-config \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_ADMIN_TOKEN" \
  -d '{
    "default_protocol": "tuic",
    "recommended_protocol": "tuic",
    "selector_style": "compact",
    "protocol_options": [
      {
        "value": "tuic",
        "label": "TUIC",
        "description": "获取 TUIC 节点",
        "icon": "mdi:rocket-launch-outline",
        "enabled": true
      },
      {
        "value": "anytls",
        "label": "AnyTLS",
        "description": "获取 AnyTLS 节点",
        "icon": "mdi:shield-lock-outline",
        "enabled": true
      }
    ]
  }'
```

## 修改代码后的检查

改完小后端代码后建议跑：

```bash
bun --filter ppanel-protocol-config-service check
bunx tsc -p apps/protocol-config/tsconfig.json --noEmit
bun --filter ppanel-protocol-config-service build
```

如果前端也改了，再跑：

```bash
bun --filter ppanel-admin-web check
bun --filter ppanel-user-web check
bun --filter ppanel-admin-web build
bun --filter ppanel-user-web build
```

## 构建 Docker 镜像

在仓库根目录执行：

```bash
bun --filter ppanel-protocol-config-service build:binary
docker build -f apps/protocol-config/Dockerfile -t ppanel-protocol-config .
```

当前 Dockerfile 使用 `debian:bookworm-slim` 基础镜像，镜像内只包含一个 Bun 编译出来的单文件可执行程序和它需要的 glibc 运行环境。不要改成 `scratch`，Bun 编译产物仍依赖动态链接器和 glibc，`scratch` 容器会启动失败。

运行：

```bash
docker run -d \
  --name ppanel-protocol-config \
  --restart unless-stopped \
  -p 3002:3002 \
  -e PPANEL_API_BASE=http://ppanel-server:8080 \
  -v ppanel-protocol-config-data:/data \
  ppanel-protocol-config
```

如果原后端在宿主机端口，例如 `8080`：

```bash
docker run -d \
  --name ppanel-protocol-config \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  -p 3002:3002 \
  -e PPANEL_API_BASE=http://host.docker.internal:8080 \
  -v ppanel-protocol-config-data:/data \
  ppanel-protocol-config
```

## 推送到 Docker Hub

先登录：

```bash
docker login
```

使用仓库提供的脚本发布：

```bash
DOCKERHUB_REPO=你的用户名/ppanel-protocol-config \
VERSION=1.0.0 \
./scripts/publish-protocol-config-image.sh
```

脚本会推送：

- `你的用户名/ppanel-protocol-config:1.0.0`
- `你的用户名/ppanel-protocol-config:latest`

不推送 `latest`：

```bash
DOCKERHUB_REPO=你的用户名/ppanel-protocol-config \
VERSION=1.0.0 \
PUSH_LATEST=false \
./scripts/publish-protocol-config-image.sh
```

多架构镜像：

```bash
docker buildx create --use

DOCKERHUB_REPO=你的用户名/ppanel-protocol-config \
VERSION=1.0.0 \
PLATFORMS=linux/amd64 \
./scripts/publish-protocol-config-image.sh
```

注意：当前镜像使用宿主机 Bun 编译出来的二进制文件，默认适合你当前机器架构。要同时发布 `linux/amd64,linux/arm64`，需要分别在对应架构机器上编译，或者改成多阶段基础镜像构建。

## 线上部署 Docker Hub 镜像

```bash
docker pull 你的用户名/ppanel-protocol-config:latest

docker rm -f ppanel-protocol-config

docker run -d \
  --name ppanel-protocol-config \
  --restart unless-stopped \
  -p 3002:3002 \
  -e PPANEL_API_BASE=http://ppanel-server:8080 \
  -v ppanel-protocol-config-data:/data \
  你的用户名/ppanel-protocol-config:latest
```

如果使用 compose，把 `image` 换成你的 Docker Hub 镜像即可：

```yaml
services:
  protocol-config:
    image: 你的用户名/ppanel-protocol-config:latest
    restart: unless-stopped
    ports:
      - "3002:3002"
    environment:
      PPANEL_API_BASE: http://ppanel-server:8080
    volumes:
      - ppanel-protocol-config-data:/data

volumes:
  ppanel-protocol-config-data:
```

## Nginx 反代

建议挂到前端同域名，避免跨域：

```nginx
location ^~ /protocol-config {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
}
```

前端默认访问当前域名的 `/protocol-config`。如果你把小后端部署到单独域名，构建前端时设置：

```bash
VITE_PROTOCOL_CONFIG_BASE_URL=https://config.example.com
```

## 数据备份

默认数据在 Docker volume `ppanel-protocol-config-data` 里，容器内路径是：

```text
/data/protocol-config.json
```

备份：

```bash
docker run --rm \
  -v ppanel-protocol-config-data:/data \
  -v "$PWD":/backup \
  alpine cp /data/protocol-config.json /backup/protocol-config.json
```

恢复：

```bash
docker run --rm \
  -v ppanel-protocol-config-data:/data \
  -v "$PWD":/backup \
  alpine cp /backup/protocol-config.json /data/protocol-config.json
```
