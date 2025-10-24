// SPDX-License-Identifier: Apache-2.0
/**
 * Package Commands: install, uninstall, and refresh packages
 *
 * Provides user-facing commands for:
 * - Installing packages with progress feedback
 * - Uninstalling packages with confirmation
 * - Refreshing the package list
 */

import * as vscode from 'vscode'

import ruyi from '../common/ruyi'
import { PackageService } from '../features/packages/PackageService'
import { PackagesTreeProvider, VersionItem } from '../features/packages/PackagesTree'

export default function registerPackagesCommands(ctx: vscode.ExtensionContext) {
  // Initialize service and tree provider
  const packageService = new PackageService()
  const packagesTreeProvider = new PackagesTreeProvider(packageService)

  // Register tree view
  const packagesTreeView = vscode.window.createTreeView('ruyiPackagesView', {
    treeDataProvider: packagesTreeProvider,
    showCollapseAll: true,
  })
  ctx.subscriptions.push(packagesTreeView)

  // Auto-refresh on activation
  void packagesTreeProvider.refresh()

  const installDisposable = vscode.commands.registerCommand(
    'ruyi.packages.install',
    async (item: VersionItem) => {
      if (!(item instanceof VersionItem)) {
        vscode.window.showErrorMessage('Invalid package selection.')
        return
      }

      const packageId = item.getPackageId()
      const packageName = item.pkg.name.split('/').pop() || item.pkg.name

      const choice = await vscode.window.showInformationMessage(
        `Install ${packageName} ${item.versionInfo.version}?`,
        { modal: false },
        'Install',
        'Cancel',
      )

      if (choice !== 'Install') {
        return
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Installing ${packageName}...`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Running ruyi install...' })

          const result = await ruyi.timeout(60_000).install(packageId)
          if (result.code === 0) {
            vscode.window.showInformationMessage(
              `✓ Successfully installed ${packageName} ${item.versionInfo.version}`)

            await packagesTreeProvider.refresh()
          }
          else {
            const errorMsg = result.stderr || result.stdout || 'Unknown error'
            vscode.window.showErrorMessage(
              `Failed to install ${packageName}: ${errorMsg}`)
          }
        },
      )
    },
  )

  const uninstallDisposable = vscode.commands.registerCommand(
    'ruyi.packages.uninstall',
    async (item: VersionItem) => {
      if (!(item instanceof VersionItem)) {
        vscode.window.showErrorMessage('Invalid package selection.')
        return
      }

      const packageId = item.getPackageId()
      const packageName = item.pkg.name.split('/').pop() || item.pkg.name

      const choice = await vscode.window.showWarningMessage(
        `Uninstall ${packageName} ${item.versionInfo.version}?`,
        { modal: false },
        'Uninstall',
        'Cancel',
      )

      if (choice !== 'Uninstall') {
        return
      }

      const confirmation = await vscode.window.showWarningMessage(
        `Are you sure you want to uninstall ${packageName} ${item.versionInfo.version}? This action cannot be undone.`,
        { modal: false },
        'Yes, Uninstall',
        'Cancel',
      )

      if (confirmation !== 'Yes, Uninstall') {
        return
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Uninstalling ${packageName}...`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Running ruyi remove...' })

          const result = await ruyi.timeout(60_000).uninstall(packageId)
          if (result.code === 0) {
            vscode.window.showInformationMessage(
              `✓ Successfully uninstalled ${packageName} ${item.versionInfo.version}`)

            await packagesTreeProvider.refresh()
          }
          else {
            const errorMsg = result.stderr || result.stdout || 'Unknown error'
            vscode.window.showErrorMessage(
              `Failed to uninstall ${packageName}: ${errorMsg}`)
          }
        },
      )
    },
  )

  const refreshDisposable = vscode.commands.registerCommand(
    'ruyi.packages.refresh',
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Refreshing package list...',
          cancellable: false,
        },
        async () => {
          await packagesTreeProvider.refresh()
        },
      )
    },
  )

  ctx.subscriptions.push(
    installDisposable, uninstallDisposable, refreshDisposable)
}
