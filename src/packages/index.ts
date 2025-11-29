// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import registerExtractCommand from './extract.command'
import registerInstallCommand from './install.command'
import { PackagesTreeProvider } from './package-tree.provider'
import { PackageService } from './package.service'
import registerRefreshCommand from './refresh.command'
import registerSearchCommand from './search.command'
import registerUninstallCommand from './uninstall.command'

export default function registerPackagesModule(ctx: vscode.ExtensionContext) {
  const packageService = new PackageService()
  const packagesTreeProvider = new PackagesTreeProvider(packageService)

  const packagesTreeView = vscode.window.createTreeView('ruyiPackagesView', {
    treeDataProvider: packagesTreeProvider,
    showCollapseAll: true,
  })
  packagesTreeProvider.setTreeView(packagesTreeView)
  ctx.subscriptions.push(packagesTreeView)

  void packagesTreeProvider.refresh()

  registerInstallCommand(ctx)
  registerUninstallCommand(ctx)
  registerRefreshCommand(ctx, packagesTreeProvider)
  registerSearchCommand(ctx, packagesTreeProvider)
  registerExtractCommand(ctx)
}
