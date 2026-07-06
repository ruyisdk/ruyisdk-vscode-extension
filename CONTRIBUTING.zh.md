# 贡献指南

感谢你对 RuyiSDK VS Code 扩展的关注！本指南将帮助你了解如何参与本项目的开发与贡献。

阅读本文的其它语言版本：

* [English](./CONTRIBUTING.md)

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
  - [报告问题](#报告问题)
  - [提交代码](#提交代码)
  - [代码审查](#代码审查)
  - [DCO 签署](#dco-签署)
- [开发环境搭建](#开发环境搭建)
  - [前置要求](#前置要求)
  - [克隆与安装](#克隆与安装)
  - [运行与调试](#运行与调试)
- [项目结构](#项目结构)
- [编码规范](#编码规范)
  - [TypeScript](#typescript)
  - [代码风格](#代码风格)
  - [命名规范](#命名规范)
  - [注释与文档](#注释与文档)
- [提交规范](#提交规范)
- [本地化](#本地化)
- [测试](#测试)
- [发布流程](#发布流程)
- [许可证](#许可证)
- [获取帮助](#获取帮助)

## 行为准则

本项目遵循 [《RuyiSDK 社区行为准则》](https://ruyisdk.org/code_of_conduct)。参与本项目即表示你同意遵守其条款。

## 如何贡献

### 报告问题

如果你发现了 bug 或有功能建议，请通过 [GitHub Issues](https://github.com/ruyisdk/ruyisdk-vscode-extension/issues) 提交。

提交 Issue 时请包含以下信息：

- **问题描述**：清晰简洁地描述问题或建议
- **复现步骤**（针对 bug）：详细列出触发问题的操作步骤
- **期望行为**：描述你期望发生的结果
- **实际行为**：描述实际发生的结果
- **环境信息**：
  - VS Code 版本（`Help > About`）
  - 操作系统及版本
  - RuyiSDK 扩展版本
  - RuyiSDK CLI 版本（`ruyi --version`）
- **截图/日志**：如有，请附上相关截图或日志输出

### 提交代码

推荐按以下流程贡献代码：

1. **Fork** 本仓库至你的 GitHub 账号
2. **Clone** fork 后的仓库到本地
3. 从 `main` 分支创建新的功能分支：

   ```bash
   git checkout -b feature/your-feature-name
   ```

   分支命名建议：
   - `feature/xxx` — 新功能
   - `fix/xxx` — Bug 修复
   - `docs/xxx` — 文档更新
   - `refactor/xxx` — 代码重构

4. 编写代码，确保通过 lint 检查
5. 提交变更（使用 `git commit -s` 签署 DCO，并遵循[提交规范](#提交规范)）
6. 推送分支并发起 **Pull Request** 到 `main` 分支
7. 在 PR 描述中说明变更内容，关联相关 Issue（如 `Closes #123`）

### 代码审查

所有 PR 需要至少一位维护者审查通过后方可合并。审查过程中请：

- 保持 PR 范围聚焦，一次只做一件事
- 及时回复审查意见
- 如需讨论设计方案，优先在 Issue 中进行

### DCO 签署

本项目要求所有提交（commit）必须带有 **Developer Certificate of Origin（DCO）** 签名，以证明你有权在开源许可证下贡献此代码。

#### 什么是 DCO？

DCO 是你通过签署（sign-off）提交的方式而作出的声明。其全文如下：

```plain
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

#### 如何签署提交

你需要在每个提交的说明中添加一行 `Signed-off-by`，证明你同意 DCO：

```plain
Signed-off-by: Your Name <your.email@example.com>
```

在 `git commit` 时添加 `-s`（或 `--signoff`）参数即可自动添加此行：

```bash
git commit -s -m "feat(packages): add batch install support"
```

**配置 Git 用户信息：**

确保签名中的姓名和电子邮件与你的 Git 配置匹配。你可以使用以下命令设置：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### CI 中的 DCO 验证

所有拉取请求（PR）都会在 CI 流程中接受自动化 DCO 检查。此检查会验证 PR 中的所有提交是否都有适当的 DCO 签名。如果任何提交缺少签名，CI 检查将失败，在解决问题之前 PR 将无法被合并。

更多信息请参阅 [Developer Certificate of Origin](https://developercertificate.org/)。

## 开发环境搭建

### 前置要求

- [Node.js](https://nodejs.org/) >= 18.x
- [npm](https://www.npmjs.com/) >= 9.x
- [Visual Studio Code](https://code.visualstudio.com/) >= 1.88.0
- [RuyiSDK CLI](https://github.com/ruyisdk/ruyi)（可选，用于完整功能测试）

请参阅 [VS Code 扩展 API](https://code.visualstudio.com/api) 官方文档，了解 VS Code 扩展开发的相关指导。

### 克隆与安装

```bash
# 克隆仓库
git clone https://github.com/ruyisdk/ruyisdk-vscode-extension.git
cd ruyisdk-vscode-extension

# 安装依赖
npm install

# 编译项目
npm run compile
```

### 运行与调试

1. 在 VS Code 中打开项目根目录
2. 按 `F5` 启动扩展开发主机（Extension Development Host）
3. 在新打开的 VS Code 窗口中即可测试扩展功能

常用 npm 脚本：

| 命令 | 说明 |
|------|------|
| `npm run watch` | 监听文件变更并自动编译 |
| `npm run compile` | 一次性编译 TypeScript |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run package` | 打包生成 `.vsix` 文件 |

## 项目结构

```
ruyisdk-vscode-extension/
├── .vscode/                  # VS Code 调试和任务配置
├── l10n/                     # 本地化文件
│   ├── bundle.l10n.json
│   └── bundle.l10n.zh-cn.json
├── media/                    # 静态资源（图片、样式、脚本）
├── src/                      # 源代码
│   ├── extension.ts          # 扩展入口，注册所有模块
│   ├── board-docs/           # 开发板文档模块
│   ├── build/                # 构建状态栏模块
│   ├── common/               # 公共工具（配置、常量、日志、辅助函数）
│   ├── home/                 # 主页 WebView
│   ├── news/                 # 新闻模块
│   ├── packages/             # 软件包管理模块
│   ├── repo/                 # 仓库管理模块
│   ├── ruyi/                 # Ruyi CLI 类型定义
│   ├── setup/                # 安装/检测 RuyiSDK 模块
│   └── venv/                 # 虚拟环境管理模块
├── eslint.config.mjs         # ESLint 配置
├── package.json              # 扩展清单（manifest）
├── package.nls.json          # 英文本地化字符串
├── package.nls.zh-cn.json    # 中文本地化字符串
└── tsconfig.json             # TypeScript 配置
```

每个功能模块通常包含以下文件模式：
- `*.provider.ts` — VS Code 各类 Provider（TreeDataProvider、WebviewViewProvider 等）
- `*.command.ts` — VS Code 命令注册
- `*.service.ts` — 业务逻辑服务
- `*.helper.ts` — 辅助工具函数
- `index.ts` — 模块导出与注册入口

## 编码规范

### TypeScript

- 使用 **TypeScript 严格模式**（`strict: true`）
- 模块系统：**Node16**（ESM）
- 编译目标：**ES2022**
- 优先使用 `const` 和 `let`，禁止 `var`
- 合理使用类型推导，必要时显式标注类型
- 使用 `as const` 声明常量对象以确保类型安全

### 代码风格

本项目使用 [ESLint](https://eslint.org/) 配合以下插件统一代码风格：

- `@stylistic/eslint-plugin` — 代码风格规则
- `eslint-plugin-import` — import 语句排序与校验
- `typescript-eslint` — TypeScript 专用规则

提交前请运行 lint 检查：

```bash
npm run lint
```

主要规范：

- **缩进**：2 个空格
- **引号**：单引号 `'`
- **分号**：必须使用
- **Import 排序**：按 `builtin` → `external` → `internal` → `parent` → `sibling` → `index` 分组，组间空行分隔，组内字母排序
- **文件头注释**：源文件以 SPDX 许可证标识开头

  ```typescript
  // SPDX-License-Identifier: Apache-2.0
  ```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `package-tree.provider.ts` |
| 类 / 接口 | PascalCase | `ConfigurationService` |
| 函数 / 方法 | camelCase | `registerPackagesModule()` |
| 变量 | camelCase | `outputChannel` |
| 常量 | UPPER_SNAKE_CASE | `CONFIG_KEYS` |
| 私有静态成员 | `#` 前缀 + camelCase | `#outputChannel` |

### 注释与文档

- 模块文件使用 JSDoc 注释说明模块职责：

  ```typescript
  /**
   * RuyiSDK VS Code Extension - Common Constants
   *
   * Responsibilities:
   *  - Define shared constants used across the extension
   */
  ```

- 公开 API（类、方法）需要 JSDoc 注释
- 复杂逻辑需要行内注释解释意图
- 避免无意义的注释（如 `// set x to 1`）

## 提交规范

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Type 类型：**

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 添加或修改测试 |
| `chore` | 构建/工具/依赖变更 |
| `i18n` | 国际化/本地化 |

**Scope 范围（可选）：** 使用受影响的模块名，如 `packages`、`venv`、`news`、`setup`、`build`、`common` 等。

**示例：**

```
feat(packages): add batch install support

Add ability to select and install multiple packages simultaneously.
The selection is persisted across extension restarts.

Closes #42
```

```
fix(venv): resolve activation failure on Windows

The activation script path was constructed with forward slashes
which fails on Windows. Now using path.join for cross-platform support.
```

## 本地化

本项目使用 [`vscode-l10n`](https://github.com/microsoft/vscode-l10n) 进行本地化。目前支持中文和英文。

消息文件位于 `l10n/` 目录中：

- `bundle.l10n.json` — 英文源文件
- `bundle.l10n.zh-cn.json` — 中文翻译文件

要了解如何在 TypeScript 代码中添加新消息，请参阅 [vscode-l10n-dev](https://github.com/microsoft/vscode-l10n/tree/main/l10n-dev)。

`package.json` 中面向用户的字符串通过以下文件进行本地化：

- `package.nls.json` — 英文
- `package.nls.zh-cn.json` — 中文

在 `package.json` 中添加新的面向用户文本时，请同时更新这两个本地化文件。使用 `%key%` 语法在 `package.json` 中引用本地化字符串。

`%key%` 中的键（key）以该项的路径命名。如果该项需要通过数组访问，则数组中的位置用使该项唯一的字段（例如 `id`）来表示。例如，在 `package.json` 中：

```json
"contributes": {
  "walkthroughs": [
    {
        "id": "ruyi.welcome",
        "title": "%contributes.walkthroughs.ruyi.welcome.title%",
        "description": "%contributes.walkthroughs.ruyi.welcome.description%",
    }
  ]
}
```

上面 "title" 对应的 "key" 是 `contributes.walkthroughs.ruyi.welcome.title`。

## 测试

目前请通过以下方式进行手动测试：

1. 按 `F5` 启动扩展开发主机
2. 在开发主机中手动验证功能是否正常
3. 检查 VS Code 输出面板中的 `RuyiSDK` 日志频道是否有异常

检查要点：

- 所有命令是否正常触发
- WebView 页面是否正常渲染
- TreeView 数据是否正确展示
- 状态栏信息是否实时更新
- 不同操作系统下的表现是否一致

## 发布流程

发布由维护者通过 [GitHub Releases](https://github.com/ruyisdk/ruyisdk-vscode-extension/releases) 进行管理：

1. 更新 `package.json` 中的 `version` 字段，遵循 [SemVer](https://semver.org/lang/zh-CN/)
2. 更新 `CHANGELOG.md`（如有）
3. 创建 Git 标签并推送
4. 由维护者手动将构建产物发布到 VS Code Marketplace

版本号说明：`MAJOR.MINOR.PATCH[-prerelease]`，当前为 beta 阶段，使用 `0.x.y-beta.N` 格式。

## 许可证

你同意你对本项目的贡献将遵循 [Apache 2.0 许可证](LICENSE)。

## 获取帮助

如有疑问，可通过以下方式获取帮助：

- [GitHub Issues](https://github.com/ruyisdk/ruyisdk-vscode-extension/issues)
- [RuyiSDK 官网](https://ruyisdk.org)

---

再次感谢你的贡献！🎉
