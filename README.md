# Kendeji Frontend

基于 [PPanel frontend](https://github.com/perfect-panel/frontend) 的管理端、用户端和两个扩展服务。
正式代码统一在 `main`；项目不包含原 PPanel 后端、数据库或生产配置。

[English](./docs/deployment.en.md) · [部署说明](./README.zh-CN.md) · [自定义组件联动部署](./docs/custom-components-deployment.zh-CN.md) · [问题反馈](https://github.com/unkn0tted/Kendeji_frontend/issues)

协议选择器、默认/推荐协议、卡片/紧凑样式、订阅链接联动和节点入口改写面板均保留。
完整的前端、原后端及扩展服务连接流程见[自定义组件联动部署教程](./docs/custom-components-deployment.zh-CN.md)。

## 从源码构建

需要 **Node.js 24.18.0、Bun 1.3.14** 和 `tar`（Linux/macOS）。
已安装 [mise](https://mise.jdx.dev/) 时，可以用 `mise install` 安装仓库指定的工具版本。
Windows 建议通过 WSL2 使用下面的命令。

```bash
git clone https://github.com/unkn0tted/Kendeji_frontend.git
cd Kendeji_frontend
mise install                        # 已有指定 Node/Bun 时可跳过
bun install --frozen-lockfile
bun run test
bun run package
```

`bun run package` 会先构建并检查 TypeScript，再生成：

| 产物 | 用途 |
| --- | --- |
| `apps/admin/dist/` | 管理端静态网站 |
| `apps/user/dist/` | 用户端静态网站 |
| `release/kendeji-admin.tar.gz` | 管理端部署包，解压后直接是站点文件 |
| `release/kendeji-user.tar.gz` | 用户端部署包 |
| `release/SHA256SUMS` | 两个部署包的 SHA-256 校验值 |
| `apps/protocol-config/dist/index.js` | 协议配置服务的 Bun 产物 |
| `apps/subscription-rewriter/dist/index.js` | 订阅改写服务的 Bun 产物 |

只需要目录产物时执行 `bun run build`。只构建某个前端时执行：

```bash
bun --filter ppanel-admin-web build
bun --filter ppanel-user-web build
```

## 前端配置与部署

默认使用同源接口：原后端 `/v1/`、协议配置 `/protocol-config`、订阅改写 `/subscription-rewriter/`。
构建默认值可以直接用于同源反代部署。

需要独立 API 域名等配置时，构建前创建配置文件：

```bash
cp apps/admin/.env.example apps/admin/.env.local
cp apps/user/.env.example apps/user/.env.local
# 修改两个 .env.local 后重新执行 bun run package
```

| 构建变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | 原 PPanel API 地址；留空表示当前站点 |
| `VITE_API_PREFIX` | 后端额外路径前缀；留空为 `/v1/...`，填 `/api` 为 `/api/v1/...` |
| `VITE_PROTOCOL_CONFIG_BASE_URL` | 协议配置服务地址；留空为同源 |
| `VITE_SUBSCRIPTION_REWRITER_BASE_URL` | 订阅改写服务地址；留空为同源 |
| `VITE_SHOW_LANDING_PAGE` | 仅用户端，`false` 时首页转到登录页 |

`VITE_*` 会进入浏览器代码，不能填写密码或其他秘密；改动后必须重新构建。
原后端需兼容当前前端接口；本版本在 PPanel Server `1.20.3` 上做过生产验证。
上传各自 `dist` 的内容到管理端、用户端站点根目录，不要混放。
配置 Nginx 的 SPA 路由回退，以及原后端和所启用扩展服务的反代：
[前端部署示例](./README.zh-CN.md#nginx-静态站点)。

## Docker Hub 镜像

| 镜像 | 用途 | 文档 |
| --- | --- | --- |
| [`unkn0tted/ppanel-protocol-config:1.0.4`](https://hub.docker.com/r/unkn0tted/ppanel-protocol-config) | 保存协议选项、默认协议及展示样式 | [启动、反代、备份](./apps/protocol-config/README.md) |
| [`unkn0tted/ppanel-subscription-rewriter:1.4.2`](https://hub.docker.com/r/unkn0tted/ppanel-subscription-rewriter) | 按订阅 ID 规则改写节点入口 hostname | [数据库、启动、反代、升级](./apps/subscription-rewriter/README.md) |

已发布的这两个版本是 **Linux amd64** 镜像，前端静态文件不在其中。
部署这些镜像只需要 Docker 和 Compose，无需 Node/Bun。
服务均依赖现有 PPanel 后端验证管理员；订阅改写额外需要 MySQL 只读账号。
两个扩展服务不替代原后端。当前用户端需要订阅改写服务的公开配置接口正常返回后
才生成订阅链接；不使用改写时，仍启动该服务，展示地址和规则留空。
自定义协议选择器设置通过协议配置服务保存。

克隆后，也能直接从源码构建镜像，无需预先生成二进制：

```bash
docker build -f apps/protocol-config/Dockerfile -t ppanel-protocol-config:local .
docker build -f apps/subscription-rewriter/Dockerfile -t ppanel-subscription-rewriter:local .
```

Docker 构建固定使用 Bun 1.3.14，运行镜像包含 glibc 和 HTTPS CA 证书。
本地构建不会修改 Docker Hub 上已有版本；镜像发布步骤见各服务文档。

## 本地开发

```bash
# 原 PPanel 后端默认应运行在 localhost:8080
bun --filter ppanel-admin-web dev     # http://localhost:3001
bun --filter ppanel-user-web dev      # http://localhost:3000
```

开发服务器代理 `/v1` 和 `/api` 到原后端，两个扩展服务分别代理到
`localhost:3002`、`localhost:3003`。通过各应用 `.env.local` 可以修改目标地址。
这两个命令分别在终端运行；扩展服务启动方式见各自文档。

## 仓库与发布

- `apps/admin`、`apps/user`：前端源码。
- `apps/protocol-config`、`apps/subscription-rewriter`：扩展服务源码与部署示例。
- `packages`：共享组件、接口与 TypeScript 配置。
- `tests`：前端回归测试；服务测试位于对应 `src`。
- `docs`：保留的 PPanel 功能参考文档；本仓库的构建部署以此 README 和服务文档为准。
- 本机试验目录、数据库备份、`.env`、打包产物不提交；`bun.lock` 必须提交。

每次向 `main` 提交时，GitHub Actions 从干净环境运行测试、打包，并构建和启动两个
服务镜像。前端部署包可在该次 Actions 的 **Artifacts** 下载，默认保留 90 天。
工作流无需配置发布密钥，不会自动合并分支或推送 Docker Hub。
自定义的 `triage-automation` 仅保留手动触发，使用前需配置它所需的 webhook secrets。

## 许可证

本项目沿用上游的 [GNU GPL v3](./LICENSE)，原版权声明和历史更新日志予以保留。
