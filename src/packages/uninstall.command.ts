// SPDX-License-Identifier: Apache-2.0
/**
 * Uninstall Command: uninstall packages with confirmation
 */

import * as vscode from 'vscode'

import ruyi from '../ruyi'

<<<<<<< HEAD
import { VersionItem } from './package-tree.provider'
=======
import { PackagesTreeProvider, VersionItem } from './package-tree.provider'
>>>>>>> ee8f4ab (refactor: Restructure package module into separate files for improved maintainability)

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

<<<<<<< HEAD
export default function registerUninstallCommand(ctx: vscode.ExtensionContext) {
=======
export function registerUninstallCommand(ctx: vscode.ExtensionContext, packagesTreeProvider: PackagesTreeProvider) {
>>>>>>> ee8f4ab (refactor: Restructure package module into separate files for improved maintainability)
  const uninstallDisposable = vscode.commands.registerCommand(
    'ruyi.packages.uninstall',
    async (item: VersionItem) => {
      if (!(item instanceof VersionItem)) {
        vscode.window.showErrorMessage('Invalid package selection.')
        return
      }

      const success = await uninstallPackage(item.pkg.name, item.versionInfo.version)

      if (success) {
<<<<<<< HEAD
        await vscode.commands.executeCommand('ruyi.packages.refresh')
=======
        await packagesTreeProvider.refresh()
>>>>>>> ee8f4ab (refactor: Restructure package module into separate files for improved maintainability)
      }
    },
  )

  ctx.subscriptions.push(uninstallDisposable)
}
