# 订阅改写服务

按 `user_subscribe.id` 的区间或指定编号改写订阅内容中的节点入口 hostname。
只读查询原 MySQL，不修改数据库结构；SNI、密码、UUID、端口和节点名称保持原值。

已发布镜像：[unkn0tted/ppanel-subscription-rewriter:1.4.2](https://hub.docker.com/r/unkn0tted/ppanel-subscription-rewriter)，Linux amd64。

## 地址关系

| 用途 | 示例 | 指向 |
| --- | --- | --- |
| 原始订阅 / 服务回源 | `https://origin-sub.example.com/api/linkon` | 原 PPanel 后端 |
| 用户展示订阅 | `https://sub.example.com/api/linkon` | 本服务 |
| 管理端配置 | `/subscription-rewriter/` | 本服务，需要管理员登录 |
| 用户端展示地址 | `/subscription-rewriter/public-config` | 本服务，公开 |

请求过程：用户展示地址 → 本服务 → 按 token 查询订阅 ID → 获取原始订阅 → 应用规则 → 返回。
**回源地址必须直达原后端，不能指向本服务或用户展示地址，否则会循环请求。**
多个展示地址会向所有用户展示；编号规则只决定节点 hostname 的改写。

## 1. 创建数据库只读账号

在原 MySQL 中执行，替换数据库名和随机密码。
只授予 `user_subscribe` 表的 `SELECT` 权限：

```sql
CREATE USER 'subscription_rewriter'@'%' IDENTIFIED BY 'replace_with_random_password';
GRANT SELECT ON `ppanel`.`user_subscribe` TO 'subscription_rewriter'@'%';
```

MySQL 8 使用默认 `caching_sha2_password` 即可，不要强制切换到旧认证方式。
连接密码如含特殊字符，需要在 `DATABASE_URL` 中进行 URL 编码，
也可以使用随机十六进制密码。
MySQL 不需要对公网开放。

## 2. Docker Compose 部署

从仓库根目录执行：

```bash
cd apps/subscription-rewriter
cp .env.example .env
# 编辑数据库 URL、Docker 网络、原 PPanel 后端地址
docker compose pull
docker compose up -d
curl --fail http://127.0.0.1:3003/health
docker compose logs --tail=50
```

`.env` 关键值示例：

```dotenv
REWRITER_IMAGE_TAG=1.4.2
DATABASE_DOCKER_NETWORK=1panel-network
DATABASE_URL=mysql://subscription_rewriter:replace_with_password@mysql-container:3306/ppanel
PPANEL_API_BASE=https://api.example.com
TRUST_PROXY_HEADERS=true
```

默认 Compose 使用已存在的 Docker 网络（通常是 1Panel 的 `1panel-network`）。
检查 `docker network ls` 和 `docker ps`，数据库 hostname 应为该网络内的实际
MySQL 容器名或别名。原后端地址也必须能从服务容器访问。
只监听宿主机 loopback 的后端不能通过 bridge 网络的 `host.docker.internal` 访问。

若 MySQL 和原后端直接运行在 Linux 宿主机，可改用：

```bash
# .env 中改成实际的 127.0.0.1 数据库与后端地址
docker compose -f compose.host-network.yml up -d
```

不要同时运行两份 Compose。之后更新和查看日志也使用同一 `-f` 参数。

默认端口只绑定宿主机 `127.0.0.1:3003`，交给本机 Nginx 反代。
只有入口代理和其他可信容器可以访问此服务时，才启用 `TRUST_PROXY_HEADERS=true`。
配置保存在 volume `ppanel-subscription-rewriter-data` 的
`/data/subscription-rewriter.json`。

## 3. Nginx 反代

管理端和用户端站点都添加：

```nginx
location ^~ /subscription-rewriter/ {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}
```

缺少用户端反代时，用户端不能正常取得展示订阅地址。
前端默认同源访问；独立域名部署时，在两个前端构建前设置
`VITE_SUBSCRIPTION_REWRITER_BASE_URL`，并配置服务的 `CORS_ORIGIN`。

原始订阅域名反代到原后端，保留原订阅路径：

```nginx
# origin-sub.example.com 的 server {} 中
location ^~ /api/linkon {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

所有用户展示订阅域名反代到本服务：

```nginx
# sub.example.com 等展示域名的 server {} 中
location ^~ /api/linkon {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
}
```

这里假设宿主机 Nginx 直接面向客户端；使用 CDN 等前置代理时，
先正确配置 Nginx real_ip 的可信来源，再透传解析后的 `$remote_addr`。
不要在公开入口信任客户端自带的 `X-Forwarded-For`。
容器化 Nginx 应将 loopback 地址替换为可达的服务地址。
`PPANEL_API_BASE` 还需要能访问管理员验证路径，因此不能只反代订阅路径。

## 4. 管理端首次配置

进入管理端订阅配置的改写面板：

1. 原系统直连地址填写 `https://origin-sub.example.com/api/linkon`。
2. 用户展示地址逐行填写所有指向本服务的订阅 URL。
3. 添加原入口 hostname、目标 hostname，以及区间或指定订阅编号规则。
4. 保存后按实际订阅 ID 执行检测，再用客户端导入展示地址验证。

这里的编号是 `user_subscribe.id`，并非用户账号 ID。
优先级数字更高的规则先匹配；优先级相同则指定编号规则优先于区间规则。
旧规则没有 `match_mode` 时按区间处理。

支持 URI、Base64 包装订阅、Clash/Mihomo YAML、sing-box JSON，
以及常见 Surge/Loon/Quantumult X CONF。未匹配或不识别的内容原样返回。
普通订阅的数据库查询失败时也会返回原文并记日志，因此仅“能下载订阅”
不代表改写已生效，必须检查结果 hostname。

## 环境变量与接口

| 变量 | 默认值 / 用途 |
| --- | --- |
| `HOST` / `PORT` | `0.0.0.0` / `3003` |
| `CONFIG_FILE` | `/data/subscription-rewriter.json` |
| `PUBLIC_PATH` | `/api/linkon` |
| `DATABASE_URL` | 必填，MySQL TCP URL |
| `SUBSCRIPTION_TABLE` | `user_subscribe` |
| `SUBSCRIPTION_ID_COLUMN` / `SUBSCRIPTION_TOKEN_COLUMN` | `id` / `token` |
| `DATABASE_POOL_SIZE` / `DATABASE_IDLE_TIMEOUT` | `5` / `30` 秒 |
| `PPANEL_API_BASE` | 必填，原后端管理员验证地址 |
| `PPANEL_ADMIN_CURRENT_PATH` | `/v1/admin/user/current` |
| `UPSTREAM_TIMEOUT_MS` | `15000` |
| `MAX_RESPONSE_BYTES` | `8388608` |
| `TRUST_PROXY_HEADERS` | 服务默认 `false`，提供的 Compose 默认 `true` |
| `CORS_ORIGIN` | `*` |

管理员接口包括 `/subscription-rewriter/config`、`/rules`、`/rules/:id`、
`/rules/order`、`/inspect`，均验证原 PPanel 管理员登录态。
`/subscription-rewriter/public-config` 为公开展示地址，
`/health` 仅检查服务存活，不测试数据库及上游连接。

## 故障排查

- MySQL `Access denied`：检查账号密码、授权的数据库和 MySQL Host 范围。
- `Connection closed`：检查数据库网络、TCP 端口、URL 和 MySQL 认证方式。
- 管理接口 403：检查 `PPANEL_API_BASE`、验证路径以及 Nginx 是否传递 `Authorization`。
- 用户展示地址未更新：检查两个前端站点的同源反代，再检查公开配置接口。
- 下载成功但未改写：检查规则启用状态、订阅编号、源 hostname 和数据库日志。
- 502 / 超时：检查回源可达性，并确认回源地址没有指回本服务。

## 从源码构建与发布

克隆后在仓库根目录即可构建，无需已有二进制或本机 Node/Bun：

```bash
docker build -f apps/subscription-rewriter/Dockerfile -t ppanel-subscription-rewriter:local .
```

使用本地镜像运行时，将生产 Compose 的 `image` 改为该本地标签，
沿用相同的配置和 volume。

向自己的 Docker Hub 发布新版本：

```bash
docker login
docker buildx build --platform linux/amd64 \
  -f apps/subscription-rewriter/Dockerfile \
  -t yourname/ppanel-subscription-rewriter:1.4.3 --push .
```

不要覆盖已有固定版本。多架构发布需要可用的 QEMU/native builders，
再将 `--platform` 改为 `linux/amd64,linux/arm64`。
已发布的 `1.4.2` 目前仍只支持 amd64。

本地开发：

```bash
bun install --frozen-lockfile
DATABASE_URL='mysql://readonly:password@127.0.0.1:3306/ppanel' \
PPANEL_API_BASE=http://127.0.0.1:8080 \
CONFIG_FILE=/tmp/subscription-rewriter.json \
bun --filter ppanel-subscription-rewriter-service dev
bun run test
```

## 升级、回滚和备份

修改 `.env` 的 `REWRITER_IMAGE_TAG` 后执行：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=50
```

回滚时改回旧版本后执行同样命令，再检测真实订阅。
配置备份与恢复（文件首次保存后才存在）：

```bash
docker compose cp subscription-rewriter:/data/subscription-rewriter.json ./subscription-rewriter.backup.json
# 恢复
docker compose cp ./subscription-rewriter.backup.json subscription-rewriter:/data/subscription-rewriter.json
docker compose restart
```

备份文件留在本地，不要提交仓库。不要执行 `docker compose down -v`。
