# PPanel Subscription Rewriter

独立于 PPanel 原后端和 `protocol-config` 的第三后端。它根据
`user_subscribe.id` 的编号区间，精确替换订阅内容中的节点入口 hostname，
不修改 PPanel 数据库结构，也不会修改 SNI、密码、端口或节点名称。

生产镜像：

```text
unkn0tted/ppanel-subscription-rewriter:1.2.1
```

本文以以下实际部署关系为例：

| 用途                | 地址                                          | 最终上游                         |
| ------------------- | --------------------------------------------- | -------------------------------- |
| 原系统/内部直连订阅 | `https://internal-sub.xrognet.com/api/linkon` | 原 PPanel 后端 `127.0.0.1:60003` |
| 用户展示订阅 1      | `https://train.suuwu.de/api/linkon`           | 第三后端 `127.0.0.1:3003`        |
| 用户展示订阅 2      | `https://train.xrognet.com/api/linkon`        | 第三后端 `127.0.0.1:3003`        |
| MySQL               | 1Panel 容器 `1Panel-mysql-xxxx:3306`          | `1panel-network`                 |

部署时请将示例域名、容器名、数据库名和密码替换为实际值。

## 一、先理解四类地址

### 1. 原系统/内部直连订阅地址

```text
https://internal-sub.xrognet.com/api/linkon
```

它直接进入原 PPanel 后端，返回完全未经第三后端处理的原始订阅。第三后端也使用
这个地址回源。

### 2. 用户展示订阅地址

```text
https://train.suuwu.de/api/linkon
https://train.xrognet.com/api/linkon
```

这些地址全部进入第三后端。管理端允许逐行填写多个地址，所有用户都会看到完整
列表。它们不是按用户编号分配的；用户编号只决定订阅内容中的入口域名如何改写。

### 3. 管理端配置接口

```text
/subscription-rewriter/
```

管理端通过这个路径读取配置、保存规则和检测订阅。第三后端会把管理端请求携带
的 `Authorization` 转发给原 PPanel 后端，调用
`/v1/admin/user/current` 验证管理员身份。

### 4. 用户端公开配置接口

```text
/subscription-rewriter/public-config
```

用户端通过这个接口取得多个“用户展示订阅地址”。**管理端域名和用户端域名都
必须反代 `/subscription-rewriter/` 到第三后端。** 只配置管理端会造成管理端
显示正常，但用户端仍回退到原系统直连域名。

## 二、完整请求链路

原始订阅：

```text
客户端
  -> internal-sub.xrognet.com/api/linkon
  -> 原 PPanel 后端 127.0.0.1:60003
  -> 返回原始节点入口域名
```

改写订阅：

```text
客户端
  -> train.suuwu.de/api/linkon
  -> 第三后端 127.0.0.1:3003
  -> 根据 token 只读查询 user_subscribe.id
  -> 回源 internal-sub.xrognet.com/api/linkon
  -> 按 ID 区间改写节点入口 hostname
  -> 返回用户
```

禁止把第三后端的回源地址设置为 `train.suuwu.de` 或其他用户展示地址，否则会
形成请求循环。

## 三、支持的订阅格式

- Base64 包装的 URI、YAML、JSON 或 CONF
- 未编码的 URI 列表
- Clash/Mihomo 风格 YAML 节点
- sing-box 等常见 JSON 节点对象
- Surge/Loon/Quantumult X 常见 INI/CONF 代理行

第三后端只替换节点连接 hostname：

- 保留 `sni`
- 保留 `server_name`
- 保留密码、UUID、端口和查询参数
- 保留节点名称和 fragment
- 未匹配规则的域名保持不变
- 未识别格式原样返回
- 普通订阅请求数据库查询失败时原样返回，并在日志中记录错误

## 四、部署前检查

服务器需要：

- Linux
- Docker Engine
- Docker Compose v2
- 可用的原 PPanel 后端
- 可用的 MySQL 8/MariaDB
- 管理端和用户端前端源码或现有构建流程

检查 Docker 和 Compose：

```bash
docker version
docker compose version
```

检查当前 1Panel 网络：

```bash
docker network ls
docker network inspect 1panel-network
```

检查 MySQL 容器名：

```bash
docker ps --format 'table {{.Names}}\t{{.Networks}}\t{{.Ports}}'
```

## 五、创建 MySQL 只读账号

第三后端只需要读取：

```text
user_subscribe.id
user_subscribe.token
```

进入 1Panel MySQL：

```bash
docker exec -it 1Panel-mysql-xxxx mysql -uroot -p
```

创建只读账号。密码建议使用随机的纯字母数字或十六进制，避免 URL 编码问题：

```sql
CREATE USER IF NOT EXISTS
  'subscription_rewriter'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY '替换为随机密码';

ALTER USER
  'subscription_rewriter'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY '替换为同一个随机密码';

GRANT SELECT
ON `你的数据库名`.`user_subscribe`
TO 'subscription_rewriter'@'%';

FLUSH PRIVILEGES;
```

检查账号和授权：

```sql
SELECT user, host, plugin
FROM mysql.user
WHERE user = 'subscription_rewriter';

SHOW GRANTS FOR 'subscription_rewriter'@'%';
```

如果希望限制为当前 Docker 网段，可以把 `%` 换成例如 `172.18.%`，但 Docker
网络重建后子网可能变化。无论使用哪一种 Host，都只授予目标表的 `SELECT`。

从相同 Docker 网络测试账号：

```bash
docker run --rm -it \
  --network 1panel-network \
  mysql:8 \
  mysql \
  -h 1Panel-mysql-xxxx \
  -P 3306 \
  -u subscription_rewriter \
  -p \
  你的数据库名 \
  -e "SELECT id,token FROM user_subscribe ORDER BY id DESC LIMIT 1;"
```

出现 `Access denied for user ...@172.x.x.x` 说明网络已经连通，但 MySQL Host、
密码或账号授权不正确。

## 六、Docker Compose 部署（推荐：1Panel 网络）

生产服务器不需要安装 Bun，也不需要执行 `docker build`。

创建目录：

```bash
mkdir -p /opt/ppanel-subscription-rewriter
cd /opt/ppanel-subscription-rewriter
```

将本目录的以下文件上传到服务器：

```text
compose.yml
.env.example
```

创建配置：

```bash
cp .env.example .env
nano .env
```

推荐 Compose：

```yaml
name: ppanel-subscription-rewriter

services:
  subscription-rewriter:
    image: unkn0tted/ppanel-subscription-rewriter:${REWRITER_IMAGE_TAG:-1.2.1}
    container_name: ppanel-subscription-rewriter
    restart: unless-stopped

    ports:
      - 127.0.0.1:${REWRITER_PORT:-3003}:3003

    environment:
      HOST: 0.0.0.0
      PORT: 3003
      CONFIG_FILE: /data/subscription-rewriter.json

      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL must be set in .env}
      SUBSCRIPTION_TABLE: ${SUBSCRIPTION_TABLE:-user_subscribe}
      SUBSCRIPTION_ID_COLUMN: ${SUBSCRIPTION_ID_COLUMN:-id}
      SUBSCRIPTION_TOKEN_COLUMN: ${SUBSCRIPTION_TOKEN_COLUMN:-token}
      DATABASE_POOL_SIZE: ${DATABASE_POOL_SIZE:-5}
      DATABASE_IDLE_TIMEOUT: ${DATABASE_IDLE_TIMEOUT:-30}

      PPANEL_API_BASE: ${PPANEL_API_BASE:?PPANEL_API_BASE must be set in .env}
      PPANEL_ADMIN_CURRENT_PATH: ${PPANEL_ADMIN_CURRENT_PATH:-/v1/admin/user/current}

      UPSTREAM_TIMEOUT_MS: ${UPSTREAM_TIMEOUT_MS:-15000}
      MAX_RESPONSE_BYTES: ${MAX_RESPONSE_BYTES:-8388608}
      CORS_ORIGIN: ${CORS_ORIGIN:-*}

    extra_hosts:
      - host.docker.internal:host-gateway

    networks:
      - onepanel

    volumes:
      - subscription-rewriter-data:/data

    read_only: true
    tmpfs:
      - /tmp:size=64m,mode=1777
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    stop_grace_period: 15s

networks:
  onepanel:
    name: ${DATABASE_DOCKER_NETWORK:-1panel-network}
    external: true

volumes:
  subscription-rewriter-data:
    name: ppanel-subscription-rewriter-data
```

`.env` 示例：

```dotenv
REWRITER_IMAGE_TAG=1.2.1
REWRITER_PORT=3003

DATABASE_DOCKER_NETWORK=1panel-network
DATABASE_URL=mysql://subscription_rewriter:替换为数据库密码@1Panel-mysql-xxxx:3306/替换为数据库名

SUBSCRIPTION_TABLE=user_subscribe
SUBSCRIPTION_ID_COLUMN=id
SUBSCRIPTION_TOKEN_COLUMN=token
DATABASE_POOL_SIZE=5
DATABASE_IDLE_TIMEOUT=30

PPANEL_API_BASE=https://internal-sub.example.com
PPANEL_ADMIN_CURRENT_PATH=/v1/admin/user/current

UPSTREAM_TIMEOUT_MS=15000
MAX_RESPONSE_BYTES=8388608
CORS_ORIGIN=*
```

`PPANEL_API_BASE` 必须是第三后端容器能够访问的原 PPanel 后端：

- 推荐使用反代所有原后端路径的内部域名，例如
  `https://internal-sub.xrognet.com`。
- 如果原后端 `60003` 监听宿主机非 loopback 地址，也可以使用
  `http://host.docker.internal:60003`。
- 如果原后端也是 `1panel-network` 中的容器，最好使用它的容器名和内部端口。

检查配置展开结果：

```bash
docker compose config
```

确认网络存在：

```bash
docker network inspect 1panel-network >/dev/null
```

启动：

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail 100
```

确认容器能够解析 MySQL：

```bash
docker compose exec subscription-rewriter \
  getent hosts 1Panel-mysql-xxxx
```

确认服务只通过宿主机回环地址提供：

```bash
curl http://127.0.0.1:3003/health
```

预期：

```json
{ "code": 200, "message": "ok", "data": { "service": "subscription-rewriter" } }
```

## 七、宿主机 MySQL 的替代部署

仅当 MySQL 和原后端都真正通过宿主机 TCP 端口访问时，才使用：

```text
compose.host-network.yml
```

此方案使用 `network_mode: host`，数据库连接应填写
`127.0.0.1:宿主机映射端口`，不能使用 `1Panel-mysql-xxxx` 之类的 Docker
容器名。

启动：

```bash
docker compose \
  -f compose.host-network.yml \
  --env-file .env \
  up -d
```

不要同时使用 `network_mode: host` 和 `1panel-network`；Docker 不允许一个
服务同时采用 host 网络模式和普通 Docker 网络。

## 八、Nginx：原始订阅域名

`internal-sub.xrognet.com` 必须进入原 PPanel 后端，不能进入第三后端。

```nginx
server {
    listen 443 ssl http2;
    server_name internal-sub.xrognet.com;

    # SSL 证书配置按实际面板生成内容保留

    location ^~ / {
        proxy_pass http://127.0.0.1:60003;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
```

验证：

```bash
curl -I 'https://internal-sub.xrognet.com/api/linkon'
```

该响应不应包含：

```text
x-subscription-rewriter: 1
```

## 九、Nginx：所有用户展示订阅域名

`train.suuwu.de`、`train.xrognet.com` 等用户展示域名的 `/api/linkon` 必须
进入第三后端：

```nginx
server {
    listen 443 ssl http2;
    server_name train.suuwu.de train.xrognet.com;

    # SSL 证书配置按实际面板生成内容保留

    location ^~ /api/linkon {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;

        proxy_read_timeout 30s;
        proxy_buffering off;
    }
}
```

如果两个域名的 SSL 证书或站点配置不同，可以使用两个 `server` 块，但
`location /api/linkon` 内容相同。

验证：

```bash
curl -I 'https://train.suuwu.de/api/linkon'
curl -I 'https://train.xrognet.com/api/linkon'
```

经过第三后端的响应应包含：

```text
x-subscription-rewriter: 1
```

## 十、最容易漏掉：管理端和用户端都要配置同源反代

以下配置要同时添加到：

1. 管理员打开的管理面板域名。
2. 普通用户打开的用户面板域名。

```nginx
location ^~ /subscription-rewriter/ {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

为什么两个域名都必须配置：

- 管理端使用 `/subscription-rewriter/config` 和
  `/subscription-rewriter/rules` 管理配置。
- 用户端使用 `/subscription-rewriter/public-config` 取得展示订阅地址。
- 只配置管理端时，管理页面看起来完全正常，但用户端会读取失败并回退
  `internal-sub.xrognet.com`。

分别验证，注意必须替换成真正的管理端和用户端域名：

```bash
curl 'https://管理端域名/subscription-rewriter/public-config'
curl 'https://用户端域名/subscription-rewriter/public-config'
```

两者都应返回：

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "public_base_url": "https://train.suuwu.de/api/linkon",
    "public_base_urls": [
      "https://train.suuwu.de/api/linkon",
      "https://train.xrognet.com/api/linkon"
    ]
  }
}
```

推荐使用同源反代，并在管理端和用户端构建环境中保持：

```dotenv
VITE_SUBSCRIPTION_REWRITER_BASE_URL=
```

如果显式设置跨域地址，则需要额外处理 CORS、Authorization 和浏览器凭据；
除非确有需要，不推荐跨域。

## 十一、重新构建并部署两个前端

第三后端镜像、管理端和用户端是三个独立部署单元。更新第三后端不会自动更新
网页；更新管理端也不会自动更新用户端。

在仓库根目录执行：

```bash
bun install

bun --filter ppanel-admin-web build
bun --filter ppanel-user-web build
```

构建结果：

```text
apps/admin/dist
apps/user/dist
```

分别部署到管理端站点和用户端站点。部署后：

1. 清理 Cloudflare/CDN 缓存。
2. 清理站点静态资源缓存。
3. 使用浏览器无痕窗口重新登录。
4. 在浏览器 Network 中确认出现
   `/subscription-rewriter/public-config`。

用户页面仍显示原直连域名时，在用户页面控制台执行：

```js
fetch("/subscription-rewriter/public-config", { cache: "no-store" })
  .then((response) => response.json())
  .then(console.log);
```

- 没有发起请求：用户端仍是旧前端。
- 返回 404：用户面板域名缺少同源反代。
- 返回正确 JSON 但界面仍旧：静态资源或 CDN 缓存尚未更新。

## 十二、管理面板首次配置

进入“订阅配置”：

```text
订阅路径：
/api/linkon

原系统/直连订阅域名：
internal-sub.xrognet.com

用户展示订阅地址（每行一个）：
https://train.suuwu.de/api/linkon
https://train.xrognet.com/api/linkon
```

保存后，在“订阅入口域名分组”中：

1. 查询真实的 `user_subscribe.id`。
2. 在“读取当前入口域名”中输入该 ID。
3. 确认读取出的原入口域名。
4. 添加小范围规则，例如 `97–97`。
5. 原入口域名必须精确填写完整 hostname。
6. 新入口域名只填写 hostname，不填写协议、端口或路径。
7. 保存后再次读取，确认“替换数量”大于 0。
8. 验证完成后再扩大编号区间。

查询真实订阅 ID：

```sql
SELECT id, user_id, subscribe_id, token, status
FROM user_subscribe
WHERE token = '替换为实际token';
```

规则使用的是 `user_subscribe.id`，不是：

- `user_id`
- `subscribe_id`
- 套餐编号
- 页面排序编号

## 十三、上线验证清单

### 1. 容器和健康检查

```bash
docker compose ps
docker compose logs --tail 100
curl http://127.0.0.1:3003/health
```

### 2. MySQL

```bash
docker compose exec subscription-rewriter \
  getent hosts 1Panel-mysql-xxxx
```

然后在管理端按订阅 ID 执行“读取”。日志中不应出现：

```text
Subscription lookup failed
Access denied
Connection closed
```

### 3. 公开配置

```bash
curl 'https://管理端域名/subscription-rewriter/public-config'
curl 'https://用户端域名/subscription-rewriter/public-config'
```

两者都必须返回全部用户展示订阅地址。

### 4. 原始订阅

```bash
curl -D - -o /dev/null \
  'https://internal-sub.xrognet.com/api/linkon?token=测试token'
```

不应出现 `x-subscription-rewriter: 1`。

### 5. 改写订阅

```bash
curl -D - -o /dev/null \
  'https://train.suuwu.de/api/linkon?token=测试token&protocol=anytls'
```

应出现：

```text
x-subscription-rewriter: 1
```

命中规则时，日志会出现类似：

```text
Rewrote 18 subscription endpoint(s) for subscriber 97 (base64/uri-list)
```

## 十四、常见错误排查

### `Access denied for user ...@172.18.x.x`

含义：Docker DNS 和 MySQL TCP 已经连通，但账号 Host、密码或授权不正确。

处理：

```sql
SELECT user, host, plugin
FROM mysql.user
WHERE user = 'subscription_rewriter';

ALTER USER 'subscription_rewriter'@'%'
IDENTIFIED WITH caching_sha2_password
BY '与DATABASE_URL完全相同的密码';

GRANT SELECT
ON `你的数据库名`.`user_subscribe`
TO 'subscription_rewriter'@'%';
```

修改 `.env` 后：

```bash
docker compose up -d --force-recreate
```

### `Connection closed`

通常是数据库连接失败。先查看：

```bash
docker compose logs --tail 200
```

重点检查：

- `DATABASE_URL`
- 数据库密码是否一致
- MySQL 容器名
- `DATABASE_DOCKER_NETWORK`
- MySQL 用户 Host

### 打开管理订阅面板返回 403

含义：第三后端没有通过原 PPanel 后端验证管理员。

检查：

- 管理端请求是否包含 `Authorization`
- 管理端 Nginx 是否设置
  `proxy_set_header Authorization $http_authorization`
- `PPANEL_API_BASE` 是否能从第三后端容器访问
- `PPANEL_ADMIN_CURRENT_PATH` 是否为 `/v1/admin/user/current`

推荐：

```dotenv
PPANEL_API_BASE=https://internal-sub.xrognet.com
```

前提是该域名的 `/` 全部反代原 PPanel 后端。

### 管理端正常，用户端仍显示 internal 域名

这是用户面板域名缺少：

```text
/subscription-rewriter/
```

同源反代，或用户前端仍是旧构建。

依次检查：

1. 用户面板域名的 `/subscription-rewriter/public-config`。
2. 用户端是否重新构建。
3. CDN 和浏览器缓存。

### 用户展示域名返回原始入口

先检查响应头：

```bash
curl -I 'https://用户展示域名/api/linkon'
```

没有 `x-subscription-rewriter: 1`：Nginx 没有进入第三后端。

有该响应头但没有替换：

- 数据库查询失败时普通订阅会安全返回原内容。
- 规则 ID 区间没有覆盖真实 `user_subscribe.id`。
- 原入口 hostname 没有精确匹配。
- 规则被禁用。

### 管理端“读取”失败但普通订阅能打开

普通订阅在数据库查询失败时会原样返回，因此“能打开”不代表数据库正常。
管理端读取会把数据库或回源错误明确暴露出来，应优先检查第三后端日志。

### 502 或回源超时

检查第三后端保存的原系统地址是否为：

```text
https://internal-sub.xrognet.com/api/linkon
```

不要填写用户展示域名。可以直接测试：

```bash
curl -I 'https://internal-sub.xrognet.com/api/linkon'
```

### 请求循环

典型错误：

```text
train.suuwu.de -> 第三后端
第三后端 origin_base_url -> train.suuwu.de
```

正确配置：

```text
train.suuwu.de -> 第三后端
第三后端 origin_base_url -> internal-sub.xrognet.com
internal-sub.xrognet.com -> 原后端
```

### 确认正在运行的镜像版本

```bash
docker inspect ppanel-subscription-rewriter \
  --format '{{.Config.Image}}'
```

应为：

```text
unkn0tted/ppanel-subscription-rewriter:1.2.1
```

## 十五、升级、回滚和数据

升级：

```bash
cd /opt/ppanel-subscription-rewriter
docker compose pull
docker compose up -d
docker compose logs --tail 100
```

强制刷新 `.env`：

```bash
docker compose up -d --force-recreate
```

回滚时修改：

```dotenv
REWRITER_IMAGE_TAG=之前的版本
```

然后：

```bash
docker compose pull
docker compose up -d
```

第三后端规则和两个系统地址保存在命名卷：

```text
ppanel-subscription-rewriter-data
```

更新或重建容器不会删除该卷。备份：

```bash
mkdir -p backup

docker run --rm \
  -v ppanel-subscription-rewriter-data:/data:ro \
  -v "$PWD/backup:/backup" \
  alpine \
  tar -czf /backup/subscription-rewriter-data.tar.gz -C /data .
```

不要在未备份时执行：

```bash
docker compose down -v
```

因为 `-v` 会删除配置卷。

## 十六、环境变量参考

| 变量                        | 默认值                             | 说明                                   |
| --------------------------- | ---------------------------------- | -------------------------------------- |
| `HOST`                      | `0.0.0.0`                          | 容器监听地址；桥接网络必须是 `0.0.0.0` |
| `PORT`                      | `3003`                             | 容器内监听端口                         |
| `CONFIG_FILE`               | `/data/subscription-rewriter.json` | 地址和规则配置文件                     |
| `PUBLIC_PATH`               | `/api/linkon`                      | 对外订阅路径                           |
| `DATABASE_URL`              | 必填                               | MySQL TCP URL                          |
| `SUBSCRIPTION_TABLE`        | `user_subscribe`                   | token 所在表                           |
| `SUBSCRIPTION_ID_COLUMN`    | `id`                               | 用户订阅顺序编号字段                   |
| `SUBSCRIPTION_TOKEN_COLUMN` | `token`                            | token 字段                             |
| `DATABASE_POOL_SIZE`        | `5`                                | 数据库连接池上限                       |
| `DATABASE_IDLE_TIMEOUT`     | `30`                               | 数据库空闲连接超时秒数                 |
| `PPANEL_API_BASE`           | 必填                               | 第三后端可访问的原 PPanel 后端         |
| `PPANEL_ADMIN_CURRENT_PATH` | `/v1/admin/user/current`           | 管理员验证接口                         |
| `UPSTREAM_TIMEOUT_MS`       | `15000`                            | 原订阅回源超时                         |
| `MAX_RESPONSE_BYTES`        | `8388608`                          | 最大订阅响应字节数                     |
| `CORS_ORIGIN`               | `*`                                | 跨域来源；同源反代通常无需修改         |

表名和字段名只接受简单 SQL 标识符，token 查询使用参数绑定。

## 十七、接口参考

| 方法         | 路径                                   | 权限   | 说明                      |
| ------------ | -------------------------------------- | ------ | ------------------------- |
| `GET`        | `/api/linkon`                          | token  | 公开订阅入口              |
| `GET`        | `/health`                              | 公开   | 健康检查                  |
| `GET`        | `/subscription-rewriter/public-config` | 公开   | 用户端读取展示地址        |
| `GET/PUT`    | `/subscription-rewriter/config`        | 管理员 | 读取/保存原系统和展示地址 |
| `GET/POST`   | `/subscription-rewriter/rules`         | 管理员 | 查询/新增改写规则         |
| `PUT/DELETE` | `/subscription-rewriter/rules/:id`     | 管理员 | 修改/删除规则             |
| `POST`       | `/subscription-rewriter/inspect`       | 管理员 | 按订阅 ID 检测入口域名    |

管理员接口使用当前管理端的 `Authorization`，并调用原 PPanel 后端验证身份。

## 十八、本地开发

安装依赖：

```bash
bun install
```

运行：

```bash
DATABASE_URL='mysql://readonly:password@127.0.0.1:3306/ppanel' \
PPANEL_API_BASE='http://127.0.0.1:8080' \
CONFIG_FILE='/tmp/subscription-rewriter.json' \
bun --filter ppanel-subscription-rewriter-service dev
```

测试和构建：

```bash
bun --filter ppanel-subscription-rewriter-service test
bunx tsc -p apps/subscription-rewriter/tsconfig.json --noEmit
bun --filter ppanel-subscription-rewriter-service check
bun --filter ppanel-subscription-rewriter-service build
bun --filter ppanel-subscription-rewriter-service build:binary
```

本地构建镜像：

```bash
bun --filter ppanel-subscription-rewriter-service build:binary

docker build \
  -f apps/subscription-rewriter/Dockerfile \
  -t ppanel-subscription-rewriter:local .
```
