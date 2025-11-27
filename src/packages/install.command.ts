// SPDX-License-Identifier: Apache-2.0
/**
 * Install Command: install packages with progress feedback
 */

import * as vscode from 'vscode'

import { createProgressTracker } from '../common/helpers'
import ruyi from '../ruyi'

import { VersionItem } from './package-tree.provider'

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

export default function registerPackageInstallCommand(ctx: vscode.ExtensionContext) {
  const installDisposable = vscode.commands.registerCommand(
    'ruyi.packages.install',
    async (item: VersionItem) => {
      if (!(item instanceof VersionItem)) {
        vscode.window.showErrorMessage('Invalid package selection.')
        return
      }

      const success = await installPackage(item.pkg.name, item.versionInfo.version)

      if (success) {
        await vscode.commands.executeCommand('ruyi.packages.refresh')
      }
    },
  )

  ctx.subscriptions.push(installDisposable)
}
