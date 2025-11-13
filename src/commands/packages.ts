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

import { createProgressTracker } from '../common/helpers'
import { PackageService } from '../features/packages/PackageService'
import { PackagesTreeProvider, VersionItem } from '../features/packages/PackagesTree'
import ruyi from '../ruyi'

/**
 * Install a package by name and version
 * @param name Package name like "toolchain"
 * @param version Package version like "1.0.0", or undefined for latest
 * @returns true if successful, false otherwise
 */
export async function installPackage(name: string, version?: string): Promise<boolean> {
  const packageName = name.split('/').pop() || name
  const displayVersion = version || 'latest'
  const packageSpec = version ? `${name}(==${version})` : name

  const choice = await vscode.window.showInformationMessage(
    `Install ${packageName} ${displayVersion}?`,
    { modal: false },
    'Install',
    'Cancel',
  )

  if (choice !== 'Install') {
    return false
  }

  let success = false
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing ${packageName}...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Starting installation...', increment: 0 })

      const [onProgress, getLastPercent] = createProgressTracker(progress)

      const result = await ruyi
        .timeout(300_000)
        .onProgress(onProgress)
        .install(packageSpec)

      if (result.code === 0) {
        const finalIncrement = Math.max(0, 100 - getLastPercent())
        if (finalIncrement > 0) {
          progress.report({ message: 'Installation complete', increment: finalIncrement })
        }
        else {
          progress.report({ message: 'Installation complete' })
        }
        vscode.window.showInformationMessage(`✓ Successfully installed ${packageName} ${displayVersion}`)
        success = true
      }
      else {
        const errorMsg = result.stderr || result.stdout || 'Unknown error'
        vscode.window.showErrorMessage(`Failed to install ${packageName}: ${errorMsg}`)
      }
    },
  )

  return success
}

/**
 * Uninstall a package by name and version
 * @param name Package name like "toolchain"
 * @param version Package version like "1.0.0", or undefined for latest
 * @returns true if successful, false otherwise
 */
export async function uninstallPackage(name: string, version?: string): Promise<boolean> {
  const packageName = name.split('/').pop() || name
  const displayVersion = version || 'latest'
  const packageSpec = version ? `${name}(==${version})` : name

  const choice = await vscode.window.showWarningMessage(
    `Uninstall ${packageName} ${displayVersion}?`,
    { modal: false },
    'Uninstall',
    'Cancel',
  )

  if (choice !== 'Uninstall') {
    return false
  }

  const confirmation = await vscode.window.showWarningMessage(
    `Are you sure you want to uninstall ${packageName} ${displayVersion}? This action cannot be undone.`,
    { modal: false },
    'Yes, Uninstall',
    'Cancel',
  )

  if (confirmation !== 'Yes, Uninstall') {
    return false
  }

  let success = false
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Uninstalling ${packageName}...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Running ruyi remove...' })

      const result = await ruyi.timeout(60_000).uninstall(packageSpec)
      if (result.code === 0) {
        vscode.window.showInformationMessage(`✓ Successfully uninstalled ${packageName} ${displayVersion}`)
        success = true
      }
      else {
        const errorMsg = result.stderr || result.stdout || 'Unknown error'
        vscode.window.showErrorMessage(`Failed to uninstall ${packageName}: ${errorMsg}`)
      }
    },
  )

  return success
}

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

      const success = await installPackage(item.pkg.name, item.versionInfo.version)

      if (success) {
        await packagesTreeProvider.refresh()
      }
    },
  )

  const uninstallDisposable = vscode.commands.registerCommand(
    'ruyi.packages.uninstall',
    async (item: VersionItem) => {
      if (!(item instanceof VersionItem)) {
        vscode.window.showErrorMessage('Invalid package selection.')
        return
      }

      const success = await uninstallPackage(item.pkg.name, item.versionInfo.version)

      if (success) {
        await packagesTreeProvider.refresh()
      }
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
