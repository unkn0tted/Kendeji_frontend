# 自定义组件联动部署

[项目 README](../README.md) · [基础部署说明](../README.zh-CN.md) · [协议配置服务](../apps/protocol-config/README.md) · [订阅改写服务](../apps/subscription-rewriter/README.md)

本教程把现有 PPanel 后端、两个前端和两个扩展服务部署在一起。
适用于新机器；已有生产部署升级时，沿用原 `.env`、数据库账号和数据 volume，先备份配置。

## 1. 自定义功能与依赖

这些功能保留在 `main` 中，构建时会一起进入前端产物：

| 功能 | 管理入口 / 用户位置 | 配置保存位置 |
| --- | --- | --- |
| 协议列表、名称、说明、图标、启用状态 | 管理端「维护 → 订阅配置 → 订阅配置」；用户端「我的订阅」 | 协议配置服务 |
| 默认协议、推荐协议、卡片或紧凑选择器 | 同上 | 协议配置服务 |
| 复制订阅、一键导入、二维码跟随所选协议 | 用户端「我的订阅」 | 前端使用所选协议生成链接 |
| 多个用户展示订阅地址 | 管理端订阅配置 | 订阅改写服务 |
| 按连续订阅编号或指定编号改写节点入口 hostname | 管理端「订阅入口域名分组」面板 | 订阅改写服务 |
| 客户端、下载链接、导入 scheme 与订阅模板 | 管理端「客户端管理」 | 原 PPanel 后端 |

管理端订阅配置页面需要桌面宽度；手机窄屏会显示提示而隐藏配置面板。
用户端选择器在账号有订阅时显示。

协议选择器把 `protocol=tuic`、`protocol=anytls` 等参数加入订阅链接，
实际节点和输出内容由原后端、节点配置及客户端模板决定。
新增协议选项不会自动给后端或节点增加协议支持。

**当前用户端会等待 `/subscription-rewriter/public-config` 成功返回配置后再生成订阅链接。**
因此本教程部署两个扩展服务。不使用改写时，仍启动订阅改写服务，
将用户展示地址留空、规则留空，即可使用原系统直连订阅地址。
协议配置服务负责管理员保存自定义选择器设置；仅看到默认选择器不代表服务已经连通。

## 2. 准备域名与网络

示例采用 Linux amd64、Docker Compose V2，以及已能正常登录的 PPanel 后端。
当前前端曾在 PPanel Server `1.20.3` 上做过生产验证。
Docker Hub 的两个固定版本目前仅支持 amd64；其他架构见各服务的源码构建说明。

以下地址全部替换成自己的实际值：

| 示例 | 用途 | 反代目标 |
| --- | --- | --- |
| `admin.example.com` | 管理端静态网站 | 管理端站点目录；接口按路径分流 |
| `panel.example.com` | 用户端静态网站 | 用户端站点目录；接口按路径分流 |
| `origin-sub.example.com` | 原后端接口及原始订阅 | 原 PPanel 后端 |
| `sub.example.com` | 用户展示订阅 | 订阅改写服务 |
| `127.0.0.1:8080` | 宿主机可达的原后端端口 | 替换为实际后端地址 |
| `127.0.0.1:3002` | 协议配置服务 | Compose 默认映射 |
| `127.0.0.1:3003` | 订阅改写服务 | Compose 默认映射 |
| `1panel-network` / `mysql-container` / `ppanel` | 已有数据库网络、容器名、库名 | 替换为实际值 |

```mermaid
flowchart LR
    A[管理员浏览器] --> N[管理端站点反代]
    U[用户浏览器] --> W[用户端站点反代]
    N --> P[原 PPanel 后端]
    W --> P
    N --> C[协议配置服务 :3002]
    W --> C
    N --> R[订阅改写服务 :3003]
    W --> R
    C -->|验证管理员登录态| P
    R -->|验证管理员登录态| P
    S[订阅客户端] -->|sub.example.com| R
    R -->|回源 origin-sub.example.com| P
    R -->|只读查询订阅编号与 token| D[(原 MySQL)]
```

配置 DNS 和 HTTPS。`origin-sub.example.com` 必须直达原后端，
同时提供管理员验证路径 `/v1/admin/user/current` 和真实订阅路径。
不能把这个域名指向订阅改写服务，否则会循环回源。

本教程第 6 节默认 Nginx 直接运行在宿主机。
如果使用 1Panel 容器化 OpenResty，按第 5 节先配置共同 Docker 网络，并使用容器服务地址。
容器中的 `127.0.0.1` 指向容器自身。

## 3. 构建与放置两个前端

安装 Node.js `24.18.0`、Bun `1.3.14` 和 `tar`，然后执行：

```bash
git clone https://github.com/unkn0tted/Kendeji_frontend.git
cd Kendeji_frontend
# 已安装 mise 时可用 mise install 安装指定工具版本。
bun install --frozen-lockfile
bun run test
bun run package
```

本教程使用同源反代，两个前端的以下构建变量都留空，默认构建即可：

```dotenv
VITE_API_BASE_URL=
VITE_API_PREFIX=
VITE_PROTOCOL_CONFIG_BASE_URL=
VITE_SUBSCRIPTION_REWRITER_BASE_URL=
```

已有 `.env.local` 时核对这些值，避免继续连接旧服务。`VITE_*` 是公开的构建配置，
不能写数据库密码；修改后需要重新打包。管理端登录验证的后端和
两个扩展服务的 `PPANEL_API_BASE` 必须对应同一个 PPanel 实例。

将压缩包解到两个独立的站点目录：

```bash
mkdir -p /var/www/kendeji-admin /var/www/kendeji-user
tar -xzf release/kendeji-admin.tar.gz -C /var/www/kendeji-admin
tar -xzf release/kendeji-user.tar.gz -C /var/www/kendeji-user
```

1Panel 用户改为各自静态网站的实际目录，并使用 OpenResty 容器内可见的站点路径。
已有站点先备份，将新文件放进空目录后再切换站点根目录。
以下服务启动命令均从仓库根目录开始；每组命令最后回到仓库根目录。

## 4. 启动 Docker Hub 服务

### 协议配置服务

```bash
cd apps/protocol-config
if [ ! -f .env ]; then
    cp .env.example .env
fi
# 编辑 .env。
```

关键配置：

```dotenv
PROTOCOL_CONFIG_IMAGE_TAG=1.0.4
PROTOCOL_CONFIG_PORT=3002
PPANEL_API_BASE=https://origin-sub.example.com
PPANEL_ADMIN_CURRENT_PATH=/v1/admin/user/current
CORS_ORIGIN=*
```

`PPANEL_API_BASE` 仅填后端根地址，不要追加 `/v1/admin/user/current` 或订阅路径。
此地址必须从服务容器可达；宿主机浏览器能打开不代表容器一定能访问。
也可使用可达的内部后端地址，但原 Compose 默认网络无法解析其他 Docker 网络的服务名。

宿主机 Nginx 部署执行：

```bash
docker compose pull
docker compose up -d
curl --fail http://127.0.0.1:3002/health
curl --fail http://127.0.0.1:3002/protocol-config
cd ../..
```

使用 1Panel/OpenResty 时，启动命令改用第 5 节的网络配置。

### 订阅改写服务

在已有 MySQL 中创建只读账号，替换库名和密码；已有账号则核对授权即可：

```sql
CREATE USER 'subscription_rewriter'@'%' IDENTIFIED BY 'replace_with_random_hex_password';
GRANT SELECT ON `ppanel`.`user_subscribe` TO 'subscription_rewriter'@'%';
```

MySQL 不需要新增公网端口。查询已有容器和网络：

```bash
docker ps --format '{{.Names}}\t{{.Image}}'
docker network ls
docker inspect mysql-container --format '{{json .NetworkSettings.Networks}}'
```

准备环境文件：

```bash
cd apps/subscription-rewriter
if [ ! -f .env ]; then
    cp .env.example .env
fi
# 编辑 .env。
```

关键配置：

```dotenv
REWRITER_IMAGE_TAG=1.4.2
REWRITER_PORT=3003
PUBLIC_PATH=/api/linkon
DATABASE_DOCKER_NETWORK=1panel-network
DATABASE_URL=mysql://subscription_rewriter:replace_with_random_hex_password@mysql-container:3306/ppanel
PPANEL_API_BASE=https://origin-sub.example.com
PPANEL_ADMIN_CURRENT_PATH=/v1/admin/user/current
TRUST_PROXY_HEADERS=true
```

数据库 hostname 必须是该网络内实际的 MySQL 容器名或别名。
密码含特殊字符时做 URL 编码；使用随机十六进制密码可以避免这个问题。
`TRUST_PROXY_HEADERS=true` 的前提是只有可信入口代理和容器能访问服务。

```bash
docker compose pull
docker compose up -d
curl --fail http://127.0.0.1:3003/health
curl --fail http://127.0.0.1:3003/subscription-rewriter/public-config
docker compose logs --tail=50
cd ../..
```

默认 Compose 接入已有数据库网络。MySQL 直接运行在 Linux 宿主机时，
使用服务文档中的 `compose.host-network.yml`；后续命令也使用同一 Compose 文件。
两个 `/health` 只检查服务存活，管理员验证、数据库和真实回源要在后面实际验证。

## 5. 1Panel / 容器化 OpenResty 的连接方式

宿主机 Nginx 用户可以跳过本节。1Panel 用户先确认 OpenResty 和 MySQL
位于哪个网络；本例使用已有 `1panel-network`。

协议配置服务需要加入 OpenResty 可访问的网络。在 `apps/protocol-config/.env` 中设置：

```dotenv
PROXY_DOCKER_NETWORK=1panel-network
```

从仓库根目录执行：

```bash
cd apps/protocol-config
docker compose -f compose.yml -f compose.proxy-network.yml pull
docker compose -f compose.yml -f compose.proxy-network.yml up -d
curl --fail http://127.0.0.1:3002/health
cd ../..
```

协议配置服务之后的升级、重建也使用这两个 `-f` 参数。
订阅改写服务已经通过 `DATABASE_DOCKER_NETWORK` 加入数据库网络；
OpenResty 也必须能访问该网络。网络名称不同的部署应按实际网络调整，
不能仅凭服务名猜测连通性。

第 6 节中所有反代地址按下表替换，路径和 `Authorization` 透传保持一致：

| 宿主机示例 | 容器化 OpenResty 示例 |
| --- | --- |
| `http://127.0.0.1:3002` | `http://protocol-config:3002` |
| `http://127.0.0.1:3003` | `http://subscription-rewriter:3003` |
| `http://127.0.0.1:8080` | 同一网络内实际的 PPanel 服务名和容器端口，例如 `http://ppanel-server:8080` |

不能把后端映射到宿主机的端口误当成容器内端口。
如果原后端不在共同网络，使用已验证可达的地址。
`host.docker.internal` 也无法访问只监听宿主机 loopback 的后端。

## 6. 配置四个站点的反代

以下片段放入各自已有的 Nginx/OpenResty `server {}` 内，保留域名和 HTTPS 证书配置。
同路径已有规则时修改原规则，不要新增重复的 `location`。

### 管理端和用户端

两个站点都需要下面三条接口反代。用户端站点的 `root` 改为其自身目录：

```nginx
root /var/www/kendeji-admin;
index index.html;

location ^~ /v1/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /protocol-config {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}

location ^~ /subscription-rewriter/ {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}

location / {
    try_files $uri $uri/ /index.html;
}

location = /index.html {
    add_header Cache-Control "no-cache";
}

location = /version.lock {
    add_header Cache-Control "no-cache";
}
```

`proxy_pass` 在这三条规则里不要追加 `/`，否则可能把服务需要的路径去掉。
使用 `VITE_API_PREFIX=/api` 的已有部署，原后端规则按[基础部署说明](../README.zh-CN.md#nginx-静态站点)调整；扩展路径不变。

### 原后端 / 原始订阅域名

`origin-sub.example.com` 的站点直接反代原后端，包含管理员验证和原始订阅：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 用户展示订阅域名

`sub.example.com` 的订阅路径转发给改写服务：

```nginx
location = /api/linkon {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
}
```

增加备用展示域名时，每个域名都配置同样规则。本例不启用泛域名订阅。
使用 CDN 或前置代理时，先配置 Nginx `real_ip` 的可信来源，再透传解析后的 `$remote_addr`。
订阅响应包含用户凭据，CDN/代理应绕过订阅路径的响应缓存。

宿主机 Nginx 执行 `nginx -t`，通过后平滑重载；1Panel 用户在面板检查并重载 OpenResty。
不要给扩展路径添加管理员 `Authorization` 之外的新静态密钥；它们使用现有管理员登录态。

## 7. 在管理端配置联动

用桌面浏览器登录管理端，打开「维护 → 订阅配置」(`/dashboard/subscribe`)，
再打开页面上方的「订阅配置」。

| 字段 | 本教程的填写示例 |
| --- | --- |
| 原系统/直连订阅域名 | `origin-sub.example.com`，此字段只填域名 |
| 订阅路径 | `/api/linkon`，必须对应原后端实际路径 |
| 泛域名解析 | 本教程关闭 |
| 用户展示订阅地址 | `https://sub.example.com/api/linkon`，完整 URL；备用地址另起一行 |
| 默认协议 | `tuic` |
| 推荐协议 | `tuic` 或实际推荐的已启用协议 |
| 协议选项 | 示例 `tuic`、`anytls`；参数必须被原后端支持 |
| 选择器样式 | 卡片 `cards` 或紧凑 `compact` |

保存会分别写入原后端订阅设置、协议配置服务，以及订阅改写服务。
改写面板应随之显示原系统直连地址 `https://origin-sub.example.com/api/linkon`
和用户展示地址。多个直连域名配置时，改写服务使用第一个非空域名作为回源。
这里填写的基础 URL 不需要 token，前端会按用户订阅自动生成。

仅需协议选择器时，将「用户展示订阅地址」留空、改写规则留空；
订阅改写服务的公开配置接口仍需正常运行，用户会获得原系统直连地址。

用户展示地址列表对所有用户相同，改写规则的订阅编号只控制节点 hostname 改写，
不会按编号隐藏或分配展示地址。

### 配置节点入口改写

在「订阅入口域名分组」面板中操作：

1. 输入真实订阅编号和协议，点击「读取」，确认能够取得原始入口 hostname。
2. 添加规则：例如连续编号 `1001` 至 `1100`，将 `entry-old.example.com` 改为 `entry-new.example.com`。
3. 也可选择「指定编号」，填写实际零散订阅编号，例如 `1001, 1008, 1050`。
4. 启用并保存规则，再次「读取」，检查改写后 hostname 和替换数量。

编号是 MySQL 的 `user_subscribe.id`，不是用户账号 ID；可在数据库中查询：

```sql
SELECT id FROM `ppanel`.`user_subscribe` ORDER BY id DESC LIMIT 10;
```

原入口和目标入口仅填写 hostname，不加 `https://`、路径或端口。
优先级数字越大越先匹配；同优先级时指定编号规则优先于区间规则。
拖动列表只调整显示顺序。
目标 hostname 必须已经解析并能连接对应节点；本服务不创建 DNS 或部署节点。
改写保留原端口、SNI、密码/UUID 和节点名称。

客户端管理中的输出模板、User-Agent 和导入 scheme 仍由原 PPanel 后端管理。
一键导入还需要对应客户端已经安装、scheme 和模板配置正确。

## 8. 验证整条链路

先从两个前端域名验证公开接口，以下响应都应是 JSON，不能是站点 `index.html`：

```bash
curl --fail https://admin.example.com/v1/common/site/config
curl --fail https://admin.example.com/protocol-config
curl --fail https://admin.example.com/subscription-rewriter/public-config
curl --fail https://panel.example.com/v1/common/site/config
curl --fail https://panel.example.com/protocol-config
curl --fail https://panel.example.com/subscription-rewriter/public-config
```

然后完成以下实际操作：

1. 管理端修改选择器样式并保存，确认保存成功；公开协议配置的 `selector_style` 已更新。
2. 刷新用户端，用有订阅的账号查看「我的订阅」，确认样式、选项、默认/推荐协议一致。
3. 切换协议，确认复制的链接、二维码对应链接和导入链接都使用所选 `protocol` 参数。
4. 配置了展示地址时，用户链接应使用 `sub.example.com`；留空时应使用直连域名。
5. 使用真实客户端分别导入原始地址和展示地址，匹配规则的展示订阅应出现目标 hostname，原始订阅保持原值。
6. 以不匹配编号的订阅验证节点 hostname 不变，重建扩展容器后确认配置仍在。

普通订阅在数据库查询失败时可能返回原文，所以下载成功不能证明改写成功；
要检查管理端读取结果和客户端收到的实际 hostname。
公开配置可能缓存几十秒，保存后稍等并刷新；必要时用无痕窗口验证，避免已有浏览器缓存影响判断。
管理员接口未登录返回 403 是正常行为。

## 9. 常见问题与备份

| 现象 | 排查方向 |
| --- | --- |
| 看不到管理端协议设置 / 改写面板 | 使用桌面宽度访问 `/dashboard/subscribe`，确认部署的是本仓库管理端产物 |
| 看得到选择器，但保存失败 | 检查协议服务反代、`PPANEL_API_BASE` 和 `Authorization`；表单保存分步进行，报错后核对各服务当前配置 |
| 用户端一直提示订阅配置加载中 | 检查用户端的 `/subscription-rewriter/public-config` 和原后端公开配置；只配置管理端反代不足以让用户端连通 |
| 接口返回 HTML 或 JSON 解析失败 | 请求落入 SPA 回退，补齐对应路径反代并检查实际构建变量 |
| 扩展管理接口 403 | 两个服务和管理端必须连接同一原后端；检查验证路径和登录头透传 |
| OpenResty 502 | 检查共同 Docker 网络、服务名和容器端口；服务重建改变 IP 后重载 OpenResty，刷新已解析的地址 |
| 改写面板读取失败 | 检查只读数据库账号、网络、真实订阅编号，以及原始回源 URL |
| 订阅下载成功但 hostname 未变 | 检查规则启用状态、优先级、源 hostname、订阅编号和数据库日志 |
| 新增协议后无节点 / 客户端连接失败 | 检查原后端和实际节点支持，以及客户端模板；选择器本身不提供协议实现 |

两个服务配置位于独立 volume，前端重新构建和容器重建都不会修改它们。
首次保存后，从仓库根目录备份：

```bash
docker compose -f apps/protocol-config/compose.yml cp \
  protocol-config:/data/protocol-config.json ./protocol-config.backup.json
docker compose -f apps/subscription-rewriter/compose.yml cp \
  subscription-rewriter:/data/subscription-rewriter.json ./subscription-rewriter.backup.json
```

备份保存在本地，不要提交仓库。保留原 PPanel 数据库的独立备份。
升级使用固定镜像版本；不要执行 `docker compose down -v`。
具体恢复和镜像回滚见两个服务 README。
