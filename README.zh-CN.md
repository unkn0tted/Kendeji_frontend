<a name="readme-top"></a>

<div align="center">

<img width="160" src="https://raw.githubusercontent.com/perfect-panel/ppanel-assets/refs/heads/main/logo.svg">

<h1>PPanel 前端</h1>

这是由 PPanel 提供支持的前端

[英文](./README.md)
·
中文
·
[更新日志](./CHANGELOG.md)
·
[报告问题][issues-link]
·
[请求功能][issues-link]

<!-- SHIELD GROUP -->

[![][github-release-shield]][github-release-link]
[![][github-releasedate-shield]][github-releasedate-link]
[![][github-action-test-shield]][github-action-test-link]
[![][github-action-release-shield]][github-action-release-link]<br/>
[![][github-contributors-shield]][github-contributors-link]
[![][github-forks-shield]][github-forks-link]
[![][github-stars-shield]][github-stars-link]
[![][github-issues-shield]][github-issues-link]
[![][github-license-shield]][github-license-link]

![][split]

</div>

> **第一条**
> 人人生而自由，在尊严与权利上一律平等。
> 他们赋有理性与良知，应当以兄弟般的精神彼此相待。
>
> **第十二条**
> 任何人的隐私、家庭、住宅和通信不得任意干涉，其名誉与荣誉不得加以攻击。
> 人人有权受到法律的保护，以免遭受这种干涉或攻击。
>
> **第十九条**
> 人人有思想与表达的自由；此项自由包括持有主张而不受干预，以及通过任何媒介、无论国界，自由寻求、接受和传播信息与思想。
>
> _来源： [United Nations – Universal Declaration of Human Rights (UN.org)](https://www.un.org/sites/un2.un.org/files/2021/03/udhr.pdf)_

## 📦 Application List

| 📦 Application                                                                                                                                                                                                                                                                                                                                | 🖼️ Preview                                                     |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| [**PPanel User Web**][ppanel-user-web-github]<br/>Developed with modern frontend technologies (Next.js, TypeScript, TailwindCSS), providing basic user features with support for multiple languages and themes.<br/>[![One-Click Deploy](https://img.shields.io/badge/Deploy%20with-Vercel-blue?style=for-the-badge)][ppanel-user-web-deploy] | [![Preview][ppanel-user-web-cover]][ppanel-user-web-github]    |
| [**PPanel Admin Web**][ppanel-admin-web-github]<br/>Developed with modern frontend technologies, this admin web provides basic data management features with support for multiple languages and themes.<br/>[![One-Click Deploy](https://img.shields.io/badge/Deploy%20with-Vercel-blue?style=for-the-badge)][ppanel-admin-web-deploy]        | [![Preview][ppanel-admin-web-cover]][ppanel-admin-web-preview] |

## ⌨️ 本地开发

您可以使用 Github Codespaces 进行在线开发：

[![][codespaces-shield]][codespaces-link]

您可以使用 Gitpod 进行在线开发：

[![在 Gitpod 中打开](https://gitpod.io/button/open-in-gitpod.svg)][gitpod-link]

或者克隆项目进行本地开发：

```bash
git clone https://github.com/perfect-panel/frontend.git
cd frontend

# 按 mise.toml 安装 Node.js LTS 和 Bun 1.3 工具链
mise install

# 严格按照 bun.lock 安装依赖
mise run setup

# 构建全部工作区
mise run build
```

本仓库使用 [mise](https://mise.jdx.dev/) 管理 Node.js 和 Bun，避免污染系统环境。
版本选择器会跟随仍在维护的 Node.js LTS 通道和 Bun 1.3 维护线。需要升级时执行：

```bash
mise upgrade
mise run setup
```

工具链和项目依赖分开升级，便于控制变更范围：

```bash
mise self-update   # 升级 mise 自身
mise upgrade       # 升级 Node.js LTS 和 Bun 1.3.x
mise run outdated  # 只检查可升级的项目依赖
mise run update    # 确认后更新依赖和 bun.lock
mise run build     # 验证升级结果
```

## 协议配置小后端

本仓库包含一个独立的小后端 `apps/protocol-config`，用于在不修改现有
PPanel 后端的情况下，保存用户端订阅协议选择器配置：

- 默认协议：`default_protocol`
- 推荐协议：`recommended_protocol`
- 用户端选择器样式：`selector_style`，支持 `cards` 和 `compact`

管理端保存时会携带现有登录态 `Authorization`，小后端会请求现有后端
`/v1/admin/user/current` 校验管理员身份，校验通过后才写入本地配置文件。

### Docker 部署

在仓库根目录构建镜像：

```bash
bun --filter ppanel-protocol-config-service build:binary
docker build -f apps/protocol-config/Dockerfile -t ppanel-protocol-config .
```

如果现有后端容器在同一个 Docker 网络里，`PPANEL_API_BASE` 可以填写原后端
容器名和端口，例如 `http://ppanel-server:8080`：

```bash
docker run -d \
  --name ppanel-protocol-config \
  --restart unless-stopped \
  -p 3002:3002 \
  -e PPANEL_API_BASE=http://ppanel-server:8080 \
  -v ppanel-protocol-config-data:/data \
  ppanel-protocol-config
```

如果现有后端只通过宿主机端口暴露，例如宿主机 `8080`，Linux Docker 可以加
`--add-host=host.docker.internal:host-gateway`，然后使用
`PPANEL_API_BASE=http://host.docker.internal:8080`。

也可以参考示例：

```bash
docker compose -f apps/protocol-config/docker-compose.example.yml up -d
```

如果你要把小后端发布到 Docker Hub，完整发布和升级流程见
[`apps/protocol-config/README.md`](./apps/protocol-config/README.md)。

### Nginx 反代

将新接口挂到前端同域名下，避免跨域问题：

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

保留你现有的 `/api` 或 `/v1` 后端反代即可。前端默认会访问当前域名的
`/protocol-config`；如果你把小后端部署到独立域名，可以在构建前端时设置：

```bash
VITE_PROTOCOL_CONFIG_BASE_URL=https://config.example.com
```

## 🤝 贡献

欢迎各种类型的贡献，
如果您有兴趣贡献代码，请随时查看我们的 GitHub
[问题][github-issues-link] 来展示您的能力。

[![][pr-welcome-shield]][pr-welcome-link]

[![][contributors-contrib]][contributors-url]

<div align="right">

[![][back-to-top]](#readme-top)

</div>

---

## 📝 许可证

版权所有 © 2024 [PPanel][profile-link]。<br />
本项目使用 [GNU](./LICENSE) 许可证。

<!-- LINK GROUP -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
[codespaces-link]: https://codespaces.new/perfect-panel/ppanel-web
[codespaces-shield]: https://github.com/codespaces/badge.svg
[contributors-contrib]: https://contrib.rocks/image?repo=perfect-panel/ppanel-web
[contributors-url]: https://github.com/perfect-panel/frontend/graphs/contributors
[github-action-release-link]: https://github.com/perfect-panel/frontend/actions/workflows/release.yml
[github-action-release-shield]: https://img.shields.io/github/actions/workflow/status/perfect-panel/ppanel-web/release.yml?label=release&labelColor=black&logo=githubactions&logoColor=white&style=flat-square
[github-action-test-link]: https://github.com/perfect-panel/frontend/actions/workflows/test.yml
[github-action-test-shield]: https://img.shields.io/github/actions/workflow/status/perfect-panel/ppanel-web/test.yml?label=test&labelColor=black&logo=githubactions&logoColor=white&style=flat-square
[github-contributors-link]: https://github.com/perfect-panel/frontend/graphs/contributors
[github-contributors-shield]: https://img.shields.io/github/contributors/perfect-panel/ppanel-web?color=c4f042&labelColor=black&style=flat-square
[github-forks-link]: https://github.com/perfect-panel/frontend/network/members
[github-forks-shield]: https://img.shields.io/github/forks/perfect-panel/ppanel-web?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-link]: https://github.com/perfect-panel/frontend/issues
[github-issues-shield]: https://img.shields.io/github/issues/perfect-panel/ppanel-web?color=ff80eb&labelColor=black&style=flat-square
[github-license-link]: https://github.com/perfect-panel/frontend/blob/master/LICENSE
[github-license-shield]: https://img.shields.io/github/license/perfect-panel/ppanel-web?color=white&labelColor=black&style=flat-square
[github-release-link]: https://github.com/perfect-panel/frontend/releases
[github-release-shield]: https://img.shields.io/github/v/release/perfect-panel/ppanel-web?style=flat-square&sort=semver&logo=github
[github-releasedate-link]: https://github.com/perfect-panel/frontend/releases
[github-releasedate-shield]: https://img.shields.io/github/release-date/perfect-panel/ppanel-web?labelColor=black&style=flat-square
[github-stars-link]: https://github.com/perfect-panel/frontend/network/stargazers
[github-stars-shield]: https://img.shields.io/github/stars/perfect-panel/ppanel-web?color=ffcb47&labelColor=black&style=flat-square
[gitpod-link]: https://gitpod.io/#https://github.com/perfect-panel/frontend
[issues-link]: https://github.com/perfect-panel/frontend/issues/new/choose
[pr-welcome-link]: https://github.com/perfect-panel/frontend/pulls
[pr-welcome-shield]: https://img.shields.io/badge/🤯_pr_welcome-%E2%86%92-ffcb47?labelColor=black&style=for-the-badge
[profile-link]: https://github.com/perfect-panel
[split]: https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png
[ppanel-user-web-github]: https://github.com/perfect-panel/frontend/tree/main/apps/user
[ppanel-user-web-cover]: https://urlscan.io/liveshot/?width=1920&height=1080&url=https://user.ppanel.dev
[ppanel-user-web-preview]: https://user.ppanel.dev
[ppanel-user-web-deploy]: https://vercel.com/new/clone?demo-description=PPanel%20is%20a%20pure%2C%20professional%2C%20and%20perfect%20open-source%20proxy%20panel%20tool%2C%20designed%20to%20be%20your%20ideal%20choice%20for%20learning%20and%20practical%20use&demo-image=https%3A%2F%2Furlscan.io%2Fliveshot%2F%3Fwidth%3D1920%26height%3D1080%26url%3Dhttps%3A%2F%2Fuser.ppanel.dev&demo-title=PPanel%20User%20Web&demo-url=https%3A%2F%2Fuser.ppanel.dev%2F&from=.&project-name=ppanel-user-web&repository-name=ppanel-web&repository-url=https%3A%2F%2Fgithub.com%2Fperfect-panel%2Fppanel-web&root-directory=apps%2Fuser&skippable-integrations=1
[ppanel-admin-web-github]: https://github.com/perfect-panel/frontend/tree/main/apps/admin
[ppanel-admin-web-cover]: https://urlscan.io/liveshot/?width=1920&height=1080&url=https://admin.ppanel.dev
[ppanel-admin-web-preview]: https://admin.ppanel.dev
[ppanel-admin-web-deploy]: https://vercel.com/new/clone?demo-description=PPanel%20is%20a%20pure%2C%20professional%2C%20and%20perfect%20open-source%20proxy%20panel%20tool%2C%20designed%20to%20be%20your%20ideal%20choice%20for%20learning%20and%20practical%20use&demo-image=https%3A%2F%2Furlscan.io%2Fliveshot%2F%3Fwidth%3D1920%26height%3D1080%26url%3Dhttps%3A%2F%2Fadmin.ppanel.dev&demo-title=PPanel%20Admin%20Web&demo-url=https%3A%2F%2Fadmin.ppanel.dev%2F&from=.&project-name=ppanel-admin-web&repository-name=ppanel-web&repository-url=https%3A%2F%2Fgithub.com%2Fperfect-panel%2Fppanel-web&root-directory=apps%2Fadmin&skippable-integrations=1
