// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import { registerExtractCommand, extractPackage } from './extract.command'
import registerInstallCommand, { installPackage } from './install.command'
import { PackagesTreeProvider } from './package-tree.provider'
import { PackageHelper } from './package.helper'
import registerUninstallCommand, { uninstallPackage } from './uninstall.command'

export {
  registerInstallCommand,
  registerUninstallCommand,
  registerExtractCommand,
  PackagesTreeProvider,
  PackageHelper,
  installPackage,
  uninstallPackage,
  extractPackage,
}

export function registerPackagesModule(context: vscode.ExtensionContext): void {
  const packageHelper = new PackageHelper()
  const packagesTreeProvider = new PackagesTreeProvider(packageHelper)

  const packagesTreeView = vscode.window.createTreeView('ruyiPackagesView', {
    treeDataProvider: packagesTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(packagesTreeView)

  void packagesTreeProvider.refresh()

  registerInstallCommand(context)
  registerUninstallCommand(context)
  packagesTreeProvider.registerRefreshCommand(context)
  registerExtractCommand(context)
}
