# RuyiSDK VSCode Plugins

[中文](README_zh.md)

The official VS Code extension for RuyiSDK, providing RISC-V developers with an all-in-one development environment management experience.

<img width="1000" alt="Image" src="screenshot.png" />

Install from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=RuyiSDK.ruyisdk-vscode-extension).

## Features

### Package Management

Browse and manage all packages in the RuyiSDK ecosystem through a user-friendly graphical interface:

- **Categorized Browsing**: Packages are grouped by category for easy navigation
- **Version Management**: Expand package names to view all available versions; installed versions are marked with a green checkmark
- **Install/Uninstall**: One-click installation or uninstallation
- **Quick Search**: Click the search button in the toolbar to filter packages by name or category

### Virtual Environment Management

Easily manage RISC-V development environments through **Virtual Environments**:

- **Environment Detection**: Automatically discovers virtual environments in your workspace
- **Creation Wizard**: Click the `+` button to launch an interactive creation wizard
  - Select a preset Profile
  - Choose toolchains (multi-select supported)
  - Configure emulator (optional)
  - Customize environment name and path
- **Quick Switch**: Click on an environment name to activate/deactivate
- **Status Bar Display**: The status bar shows the currently active virtual environment in real-time

### News & Announcements

Stay updated with the latest RuyiSDK news through the **News** feature:

- **Status Bar Entry**: Click the news icon in the status bar to open the news panel
- **Card-style Browsing**: News displayed as cards with unread items clearly marked
- **Search & Filter**: Search by title, date, and other information
- **Full Content Reading**: Click a card to view the complete content with Markdown rendering support

### Source Package Extraction

Right-click on a folder in the Explorer and select **Extract RuyiSDK Package** to quickly deploy a wide variety of open-source projects.

## Getting Started

1. After installing the extension, click the **Ruyi** icon in the sidebar to access the main interface
2. If RuyiSDK is not installed, you will be guided through a one-click automatic installation
3. Browse and install the required toolchains and packages in the **Packages** view
4. Create a virtual environment in the **Virtual Environments** view and start your RISC-V development

## Configuration Options

Available settings in VS Code:

| Setting | Description | Default |
|---------|-------------|---------|
| `ruyi.checkForUpdates` | Automatically check for updates on startup | `true` |
| `ruyi.ruyiPath` | Custom RuyiSDK path | Auto-detect |
| `ruyi.telemetry` | Telemetry data collection | Prompted on first use |

## Feedback & Support

- Report Issues: [GitHub Issues](https://github.com/ruyisdk/ruyisdk-vscode-extension/issues)
- Learn More: [RuyiSDK Website](https://ruyisdk.org)

## License

[Apache-2.0](LICENSE)
