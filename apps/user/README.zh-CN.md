# Kendeji 用户端

基于 PPanel 的 用户端，共享组件位于 `packages/ui`。
请在仓库根目录安装依赖并执行构建：

```bash
bun install --frozen-lockfile
bun --filter ppanel-user-web build
bun --filter ppanel-user-web dev  # http://localhost:3000
```

构建输出为本目录的 `dist/`。
需要配置时将本目录 `.env.example` 复制为 `.env.local`，修改后重新构建。

完整的工具版本、打包和 Docker Hub 说明见 [根 README](../../README.md)，
站点反代和升级步骤见 [部署说明](../../README.zh-CN.md)。
[English deployment guide](../../docs/deployment.en.md)。
