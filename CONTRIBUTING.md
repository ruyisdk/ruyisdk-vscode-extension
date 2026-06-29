# Contributing Guide

Thank you for your interest in contributing to the RuyiSDK VS Code extension!
This guide will help you understand how to participate in the development of
this project.

Read in other languages:

* [中文](./CONTRIBUTING.zh.md)

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Issues](#reporting-issues)
  - [Submitting Code](#submitting-code)
  - [Code Review](#code-review)
  - [DCO Sign-Off](#dco-sign-off)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Clone & Install](#clone--install)
  - [Run & Debug](#run--debug)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
  - [TypeScript](#typescript)
  - [Code Style](#code-style)
  - [Naming Conventions](#naming-conventions)
  - [Comments & Documentation](#comments--documentation)
- [Commit Conventions](#commit-conventions)
- [Localization](#localization)
- [Testing](#testing)
- [Release Process](#release-process)
- [License](#license)
- [Getting Help](#getting-help)

## Code of Conduct

This project follows the [RuyiSDK Code of Conduct](https://ruyisdk.org/en/code_of_conduct).
By participating, you agree to abide by its terms.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request, please submit it via
[GitHub Issues](https://github.com/ruyisdk/ruyisdk-vscode-extension/issues).

When submitting an issue, please include:

- **Description**: A clear and concise description of the problem or suggestion
- **Steps to Reproduce** (for bugs): Detailed steps to trigger the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment Information**:
  - VS Code version (`Help > About`)
  - Operating system and version
  - RuyiSDK extension version
  - RuyiSDK CLI version (`ruyi --version`)
- **Screenshots/Logs**: Attach relevant screenshots or log output if available

### Submitting Code

We recommend the following workflow for contributing code:

1. **Fork** this repository to your GitHub account
2. **Clone** your fork locally
3. Create a feature branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

   Branch naming suggestions:
   - `feature/xxx` — New feature
   - `fix/xxx` — Bug fix
   - `docs/xxx` — Documentation update
   - `refactor/xxx` — Code refactoring

4. Write your code and ensure it passes lint checks
5. Commit your changes (use `git commit -s` for DCO sign-off, following [Commit Conventions](#commit-conventions))
6. Push your branch and open a **Pull Request** against `main`
7. Describe your changes in the PR and reference related issues (e.g., `Closes #123`)

### Code Review

All PRs require approval from at least one maintainer before merging. During review:

- Keep PRs focused — one thing at a time
- Respond to review feedback promptly
- Discuss design decisions in issues before implementation

### DCO Sign-Off

All commits to this project must include a **Developer Certificate of Origin (DCO)**
sign-off, certifying that you have the right to contribute the code under the
open source license.

#### What is the DCO?

The DCO is a declaration you make by signing off your commits. Its full text is
reproduced below:

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

#### How to Sign Off Commits

Add a `Signed-off-by` line to each commit message to certify your agreement
with the DCO:

```plain
Signed-off-by: Your Name <your.email@example.com>
```

Use the `-s` or `--signoff` flag when committing to add this automatically:

```bash
git commit -s -m "feat(packages): add batch install support"
```

**Configure Git User Information:**

Make sure the name and email in the signature match your Git configuration:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### DCO Enforcement in CI

All pull requests go through an automated DCO check in our CI pipeline. This
check verifies that all commits in your PR have a proper DCO sign-off. If any
commits are missing the sign-off, the CI check will fail, and your PR cannot be
merged until the issue is resolved.

For more information, see the [Developer Certificate of Origin](https://developercertificate.org/).

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- [npm](https://www.npmjs.com/) >= 9.x
- [Visual Studio Code](https://code.visualstudio.com/) >= 1.88.0
- [RuyiSDK CLI](https://github.com/ruyisdk/ruyi) (optional, for full feature testing)

Refer to the [VS Code Extension API](https://code.visualstudio.com/api) documentation
for official guidance on developing VS Code extensions.

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/ruyisdk/ruyisdk-vscode-extension.git
cd ruyisdk-vscode-extension

# Install dependencies
npm install

# Compile the project
npm run compile
```

### Run & Debug

1. Open the project root in VS Code
2. Press `F5` to launch the Extension Development Host
3. Test the extension features in the newly opened VS Code window

Common npm scripts:

| Command | Description |
|---------|-------------|
| `npm run watch` | Watch for file changes and auto-compile |
| `npm run compile` | Compile TypeScript once |
| `npm run lint` | Run ESLint checks |
| `npm run package` | Package into a `.vsix` file |

## Project Structure

```
ruyisdk-vscode-extension/
├── .vscode/                  # VS Code debug and task configuration
├── l10n/                     # Localization files
│   ├── bundle.l10n.json
│   └── bundle.l10n.zh-cn.json
├── media/                    # Static assets (images, styles, scripts)
├── src/                      # Source code
│   ├── extension.ts          # Extension entry point, registers all modules
│   ├── board-docs/           # Board documentation module
│   ├── build/                # Build status bar module
│   ├── common/               # Shared utilities (config, constants, logger, helpers)
│   ├── home/                 # Home page WebView
│   ├── news/                 # News module
│   ├── packages/             # Package management module
│   ├── repo/                 # Repository management module
│   ├── ruyi/                 # Ruyi CLI type definitions
│   ├── setup/                # RuyiSDK installation/detection module
│   └── venv/                 # Virtual environment management module
├── eslint.config.mjs         # ESLint configuration
├── package.json              # Extension manifest
├── package.nls.json          # English localization strings
├── package.nls.zh-cn.json    # Chinese localization strings
└── tsconfig.json             # TypeScript configuration
```

Each module typically follows these file patterns:
- `*.provider.ts` — VS Code Providers (TreeDataProvider, WebviewViewProvider, etc.)
- `*.command.ts` — VS Code command registration
- `*.service.ts` — Business logic services
- `*.helper.ts` — Utility functions
- `index.ts` — Module exports and registration entry point

## Coding Standards

### TypeScript

- Use **TypeScript strict mode** (`strict: true`)
- Module system: **Node16** (ESM)
- Target: **ES2022**
- Prefer `const` and `let`; never use `var`
- Use type inference where appropriate, explicit annotations where necessary
- Use `as const` for constant objects to ensure type safety

### Code Style

This project uses [ESLint](https://eslint.org/) with the following plugins for
consistent code style:

- `@stylistic/eslint-plugin` — Code style rules
- `eslint-plugin-import` — Import ordering and validation
- `typescript-eslint` — TypeScript-specific rules

Run lint checks before submitting:

```bash
npm run lint
```

Key conventions:

- **Indentation**: 2 spaces
- **Quotes**: Single quotes `'`
- **Semicolons**: Required
- **Import ordering**: Group as `builtin` → `external` → `internal` → `parent` → `sibling` → `index`, with blank lines between groups and alphabetized within each group
- **File header**: Source files begin with an SPDX license identifier

  ```typescript
  // SPDX-License-Identifier: Apache-2.0
  ```

### Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| File names | kebab-case | `package-tree.provider.ts` |
| Classes / Interfaces | PascalCase | `ConfigurationService` |
| Functions / Methods | camelCase | `registerPackagesModule()` |
| Variables | camelCase | `outputChannel` |
| Constants | UPPER_SNAKE_CASE | `CONFIG_KEYS` |
| Private static members | `#` prefix + camelCase | `#outputChannel` |

### Comments & Documentation

- Module files use JSDoc comments to describe responsibilities:

  ```typescript
  /**
   * RuyiSDK VS Code Extension - Common Constants
   *
   * Responsibilities:
   *  - Define shared constants used across the extension
   */
  ```

- Public APIs (classes, methods) require JSDoc comments
- Inline comments should explain intent for complex logic
- Avoid meaningless comments (e.g., `// set x to 1`)

## Commit Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Type:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation update |
| `style` | Code formatting (no functional change) |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding or modifying tests |
| `chore` | Build/tooling/dependency changes |
| `i18n` | Internationalization/localization |

**Scope (optional):** Use the affected module name, such as `packages`, `venv`,
`news`, `setup`, `build`, `common`, etc.

**Examples:**

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

## Localization

This project supports both English and Chinese. Localization files are in the
`l10n/` directory:

- `bundle.l10n.json` — English source file
- `bundle.l10n.zh-cn.json` — Chinese translation

User-visible strings in `package.json` are localized via:

- `package.nls.json` — English
- `package.nls.zh-cn.json` — Chinese

When adding new user-visible text, update both localization files. Use the
`%key%` syntax to reference localization strings in `package.json`.

## Testing

Currently, manual testing is the primary approach:

1. Press `F5` to launch the Extension Development Host
2. Manually verify functionality in the development host
3. Check the `RuyiSDK` log channel in the VS Code Output panel for errors

Checklist:

- All commands trigger correctly
- WebView pages render properly
- TreeView data displays correctly
- Status bar updates in real time
- Consistent behavior across operating systems

## Release Process

Releases are managed by maintainers via [GitHub Releases](https://github.com/ruyisdk/ruyisdk-vscode-extension/releases):

1. Update the `version` field in `package.json` following [SemVer](https://semver.org/)
2. Update `CHANGELOG.md` (if applicable)
3. Create and push a Git tag
4. Maintainers manually publish the build artifact to the VS Code Marketplace

Version format: `MAJOR.MINOR.PATCH[-prerelease]`. The project is currently in
beta, using the `0.x.y-beta.N` format.

## License

By contributing, you agree that your contributions will be licensed under the
[Apache 2.0 License](LICENSE).

## Getting Help

If you have questions, reach out via:

- [GitHub Issues](https://github.com/ruyisdk/ruyisdk-vscode-extension/issues)
- [RuyiSDK Website](https://ruyisdk.org)

---

Thank you for contributing! 🎉
