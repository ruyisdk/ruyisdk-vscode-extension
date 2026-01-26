# RuyiSDK VSCode Plugins

[English](README.md)

RuyiSDK 官方 VS Code 扩展，为 RISC-V 开发者提供一站式的开发环境管理体验。

<img width="1000" alt="Image" src="screenshot.png" />

从 [Visual Studio 市场](https://marketplace.visualstudio.com/items?itemName=RuyiSDK.ruyisdk-vscode-extension)安装本插件.

## 功能亮点

### 软件包管理

通过友好的图形化界面，可以直观地浏览和管理 RuyiSDK 生态中的所有软件包：

- **分类浏览**：软件包按类别分组显示，一目了然
- **版本管理**：展开包名查看所有可用版本，已安装版本会显示绿色勾号
- **安装/卸载**：一键点击即可安装或卸载
- **快速搜索**：点击工具栏搜索按钮，按名称或类别筛选包

### 虚拟环境管理

通过 **Virtual Environments** 轻松管理 RISC-V 开发环境：

- **环境检测**：自动发现工作区中的虚拟环境
- **创建向导**：点击 `+` 按钮启动交互式创建向导
  - 选择预设 Profile
  - 选择工具链（支持多选）
  - 配置模拟器（可选）
  - 自定义环境名称和路径
- **快速切换**：点击环境名称即可激活/停用
- **状态栏显示**：底部状态栏实时显示当前激活的虚拟环境

### 新闻与公告

通过 **News** 功能获取 RuyiSDK 的最新动态：

- **状态栏入口**：点击底部状态栏的新闻图标打开新闻面板
- **卡片式浏览**：新闻以卡片形式展示，未读消息有醒目标记
- **搜索过滤**：支持按标题、日期等信息搜索
- **详情阅读**：点击卡片查看完整内容，支持 Markdown 格式渲染

### 源码包提取

在资源管理器中右键点击文件夹，选择 **Extract RuyiSDK Package** 可快速部署丰富的开源项目。

## 快速上手

1. 安装扩展后，点击侧边栏的 **Ruyi** 图标进入主界面
2. 如未安装将引导用户一键自动安装
3. 在 **Packages** 视图浏览并安装所需的工具链和软件包
4. 在 **Virtual Environments** 视图创建虚拟环境，开始 RISC-V 开发

## 配置选项

在 VS Code 设置中可配置：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| `ruyi.checkForUpdates` | 启动时自动检查更新 | `true` |
| `ruyi.ruyiPath` | 自定义 RuyiSDK 路径 | 自动检测 |
| `ruyi.telemetry` | 遥测数据收集 | 首次使用时询问 |

## 反馈与支持

- 问题反馈：[GitHub Issues](https://github.com/ruyisdk/ruyisdk-vscode-extension/issues)
- 了解更多：[RuyiSDK 官网](https://ruyisdk.org)

## 许可证

[Apache-2.0](LICENSE)
