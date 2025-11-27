// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import registerExtractCommand, { extractPackage } from './extract.command'
import registerPackageInstallCommand, { installPackage } from './install.command'
import { PackagesTreeProvider } from './package-tree.provider'
import { PackageService } from './package.service'
import registerRefreshCommand from './refresh.command'
import registerPackageUninstallCommand, { uninstallPackage } from './uninstall.command'

export {
  registerPackageInstallCommand,
  registerPackageUninstallCommand,
  registerExtractCommand,
  registerRefreshCommand,
  PackagesTreeProvider,
  PackageService,
  installPackage,
  uninstallPackage,
  extractPackage,
}

export function registerPackagesModule(context: vscode.ExtensionContext): void {
  const packageService = new PackageService()
  const packagesTreeProvider = new PackagesTreeProvider(packageService)

  const packagesTreeView = vscode.window.createTreeView('ruyiPackagesView', {
    treeDataProvider: packagesTreeProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(packagesTreeView)

  void packagesTreeProvider.refresh()

  registerPackageInstallCommand(context)
  registerPackageUninstallCommand(context)
  registerRefreshCommand(context, packagesTreeProvider)
  registerExtractCommand(context)
}
