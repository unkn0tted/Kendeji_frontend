# 分支约定

本仓库只保留 `main` 作为正式分支，内容来自原 `kfc` 的生产验证版本。
普通 `git clone` 即可取得当前代码；旧的多品牌分支和每周自动合并流程已取消。

修改后执行 `bun run test` 和 `bun run package`，通过后提交到 `main`。
GitHub Actions 会再次从干净环境安装、测试、构建，并提供前端压缩包下载。

上游 [perfect-panel/frontend](https://github.com/perfect-panel/frontend) 的更新按需人工评估和引入。
不自动合并上游代码，也不自动发布 Docker Hub 镜像。
