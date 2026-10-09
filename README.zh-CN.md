# Kendeji 部署说明

[构建与项目说明](./README.md) · [协议配置服务](./apps/protocol-config/README.md) · [订阅改写服务](./apps/subscription-rewriter/README.md)

协议选择器、默认/推荐协议、展示订阅地址及入口改写的完整流程，见
[自定义组件联动部署教程](./docs/custom-components-deployment.zh-CN.md)，包含 1Panel/OpenResty 网络配置和管理端首次设置。

## 最短部署流程

```bash
git clone https://github.com/unkn0tted/Kendeji_frontend.git
cd Kendeji_frontend
mise install
bun install --frozen-lockfile
bun run test
bun run package
cd release
sha256sum -c SHA256SUMS
```

不使用 mise 时自行安装 Node.js 24.18.0 和 Bun 1.3.14。
管理端和用户端分别解压到两个站点的根目录：

```bash
mkdir -p /var/www/kendeji-admin /var/www/kendeji-user
tar -xzf kendeji-admin.tar.gz -C /var/www/kendeji-admin
tar -xzf kendeji-user.tar.gz -C /var/www/kendeji-user
```

更新时先备份原站点目录，并将新产物部署到空目录后切换站点根目录。
使用 1Panel 时在相应静态网站的目录操作，保留原有 HTTPS 证书与域名设置。

## Nginx 静态站点

以下为管理端 `server {}` 内的基础配置，替换站点路径和原后端端口。
用户端使用相同配置，站点根目录改为 `/var/www/kendeji-user`。
HTTPS 监听和证书沿用已有配置。

```nginx
root /var/www/kendeji-admin;
index index.html;

# 原 PPanel 后端：保留 /v1 路径。
location ^~ /v1/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 协议配置服务，在管理端和用户端都加入。
location = /protocol-config {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}

# 订阅改写服务，在管理端和用户端都加入。
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

# Vite 带内容哈希的文件可以长期缓存。
location ^~ /static/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

如果使用 `VITE_API_PREFIX=/api`，原后端反代改为：

```nginx
location ^~ /api/v1/ {
    proxy_pass http://127.0.0.1:8080/v1/;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

扩展服务路径不受 `VITE_API_PREFIX` 影响。
这些示例假设 Nginx 直接运行在宿主机；容器内的 `127.0.0.1` 是容器本身，
容器化 Nginx 应使用共同 Docker 网络内的服务名或可达的宿主机地址。

配置后执行 `nginx -t`，再平滑重载 Nginx。
检查两个站点能刷新子页面，且浏览器里的 `/v1/common/site/config` 返回 JSON，
不是 `index.html`。

## Docker Hub 扩展服务

完整使用当前用户端时应部署两个服务。即使不用改写规则，订阅改写服务的
`/subscription-rewriter/public-config` 也需连通；将展示地址和规则留空即可使用直连订阅。

部署已发布镜像不需要编译源码，进入对应目录：

```bash
cd apps/protocol-config
cp .env.example .env
# 编辑 .env：PPANEL_API_BASE 必须能从容器访问原后端
docker compose pull
docker compose up -d
curl --fail http://127.0.0.1:3002/health
```

订阅改写服务还需要 MySQL 只读账号和数据库所在 Docker 网络：

```bash
cd apps/subscription-rewriter
cp .env.example .env
# 编辑 DATABASE_URL、DATABASE_DOCKER_NETWORK、PPANEL_API_BASE
docker compose pull
docker compose up -d
curl --fail http://127.0.0.1:3003/health
```

以上两段分别从仓库根目录进入相应服务目录。
详细的数据库授权、订阅域名反代和管理端首次配置见
[订阅改写服务文档](./apps/subscription-rewriter/README.md)。

## 升级与回滚

前端回滚使用之前备份的完整站点目录。
扩展服务生产部署使用固定镜像版本，在各自 `.env` 中修改版本后：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=50
```

回滚时改回旧版本再执行同样命令。配置保存在独立 Docker volume，
不要使用 `docker compose down -v`。
各服务的配置文件备份方法见对应文档。
