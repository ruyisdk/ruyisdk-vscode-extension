// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { createProgressTracker } from '../common/helpers'
import ruyi from '../ruyi'

import { PackagesTreeProvider, VersionItem } from './package-tree.provider'

type Installable = VersionItem | [string, string?]

/**
 * Install a package by name and version
 * @param provider The packages tree provider
 * @param name Package name like "toolchain"
 * @param version Package version like "1.0.0", or undefined for latest
 * @param skipConfirm If true, skip the confirmation dialog
 * @returns true if successful, false otherwise
 */
export async function installPackage(
  provider: PackagesTreeProvider,
  name: string,
  version?: string,
  skipConfirm: boolean = false,
): Promise<boolean> {
  const packageName = name.split('/').pop() || name
  const displayVersion = version || 'latest'
  const packageSpec = version ? `${name}(==${version})` : name

  if (!skipConfirm) {
    const choice = await vscode.window.showInformationMessage(
      vscode.l10n.t('Install {0} {1}?', packageName, displayVersion),
      { modal: false },
      vscode.l10n.t('Install'),
      vscode.l10n.t('Cancel'),
    )

    if (choice !== vscode.l10n.t('Install')) {
      return false
    }
  }

  let success = false
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: vscode.l10n.t('Installing {0}...', packageName),
      cancellable: false,
    },
    async (progress) => {
      provider.markPackageInstalling(name, displayVersion)

      progress.report({ message: vscode.l10n.t('Starting installation...'), increment: 0 })

      const [onProgress, getLastPercent] = createProgressTracker(progress)

      const result = await ruyi
        .timeout(300_000)
        .onProgress(onProgress)
        .install(packageSpec)

      provider.unmarkPackageInstalling(name, displayVersion)

      if (result.code === 0) {
        const finalIncrement = Math.max(0, 100 - getLastPercent())
        if (finalIncrement > 0) {
          progress.report({ message: vscode.l10n.t('Installation complete'), increment: finalIncrement })
        }
        else {
          progress.report({ message: vscode.l10n.t('Installation complete') })
        }
        vscode.window.showInformationMessage('✓ ' + vscode.l10n.t('Successfully installed {0} {1}', packageName, displayVersion))
        success = true
      }
      else {
        const errorMsg = result.stderr || result.stdout || vscode.l10n.t('Unknown error')
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to install {0}: {1}', packageName, errorMsg))
      }
    },
  )

  return success
}

export default function registerInstallCommand(ctx: vscode.ExtensionContext, provider: PackagesTreeProvider) {
  const installDisposable = vscode.commands.registerCommand(
    'ruyi.packages.install',
    async (installable: Installable) => {
      let name: string
      let version: string | undefined

      if (installable instanceof VersionItem) {
        name = installable.pkg.name
        version = installable.versionInfo.version
      }
      else if (Array.isArray(installable)) {
        name = installable[0]
        version = installable[1]
      }
      else {
        vscode.window.showErrorMessage(vscode.l10n.t('Invalid package selection.'))
        return
      }

      const success = await installPackage(provider, name, version)

      if (success) {
        await provider.shallowRefresh()
      }

      return success
    },
  )

  ctx.subscriptions.push(installDisposable)
}
