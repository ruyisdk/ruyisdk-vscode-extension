// SPDX-License-Identifier: Apache-2.0
import type { ExecException } from 'node:child_process'
import * as vscode from 'vscode'

import * as semver from 'semver'

import { logger } from '../common/logger'

import { detectRuyiInstallation, fetchGitHubReleases, listAllInstallations } from './manage.service'
import {
  executeRuyiInstall,
  executeRuyiUpdate,
  PACKAGE_METHODS,
  type PackageMethodKey,
  type PackageMethod,
} from './setup.helper'

const INSTALLATION_GUIDE_URL = vscode.l10n.t('https://ruyisdk.org/en/docs/Package-Manager/installation')

function getErrorDetails(error: unknown): string {
  const execError = error as ExecException
  return execError.stderr || execError.message || String(error)
}

async function showErrorWithCopyDetails(
  operation: 'install' | 'update',
  methodName: string,
  error: unknown,
): Promise<void> {
  const details = getErrorDetails(error)
  logger.error(`${operation} failed via ${methodName}:`, details)

  const displayOperation = operation === 'install' ? vscode.l10n.t('Installation') : vscode.l10n.t('Update')
  const action = await vscode.window.showErrorMessage(
    vscode.l10n.t('{0} failed via {1}.', displayOperation, methodName),
    vscode.l10n.t('Copy Details'),
    vscode.l10n.t('OK'),
  )

  if (action === vscode.l10n.t('Copy Details')) {
    await vscode.env.clipboard.writeText(details)
    await vscode.window.showInformationMessage(vscode.l10n.t('Error details copied to clipboard.'))
  }
}

async function handleSuccessAndPromptReload(
  action: 'install' | 'update',
  methodName: string,
): Promise<void> {
  const installation = await detectRuyiInstallation()
  const version = installation?.version

  const successMessage = action === 'install'
    ? vscode.l10n.t('Ruyi installed via {0}: {1}', methodName, `${version}`)
    : vscode.l10n.t('Ruyi updated via {0}: {1}', methodName, `${version}`)

  const verificationFailureMessage = action === 'install'
    ? vscode.l10n.t('Installation completed, but Ruyi installation could not be verified. Please reload the window manually.')
    : vscode.l10n.t('Update completed, but the local Ruyi version could not be verified. Please reload the window manually.')

  if (version) {
    await vscode.commands.executeCommand('ruyi.packages.refresh')
    const userAction = await vscode.window.showInformationMessage(
      successMessage,
      vscode.l10n.t('Reload Window'),
      vscode.l10n.t('Later'),
    )
    if (userAction === vscode.l10n.t('Reload Window')) {
      await vscode.commands.executeCommand('workbench.action.reloadWindow')
    }
  }
  else {
    vscode.window.showWarningMessage(verificationFailureMessage)
  }
}

export async function checkRuyiUpdate(currentVersion: string): Promise<void> {
  try {
    const currentCoerced = semver.coerce(currentVersion)
    if (!currentCoerced) {
      logger.warn(`Unable to parse version from: ${currentVersion}`)
      return
    }

    const releases = await fetchGitHubReleases()
    if (releases.length === 0) {
      return
    }

    // Find the latest stable release (non-prerelease)
    const latestRelease = releases.find(r => !r.prerelease)
    if (!latestRelease) {
      logger.warn('No stable release found on GitHub')
      return
    }

    const latestVersion = latestRelease.tag_name.replace(/^v/, '')
    const latestStableCoerced = semver.coerce(latestVersion)
    if (!latestStableCoerced) {
      logger.warn(`Unable to parse latest stable version from GitHub tag: ${latestRelease.tag_name}`)
      return
    }

    const installations = await listAllInstallations({ includeTags: false })
    const latestInstalledVersion = installations.find(item => item.parsedVersion)?.parsedVersion
      ?? currentCoerced

    // Only prompt when the latest installed local version is behind GitHub latest stable.
    if (!semver.gt(latestStableCoerced, latestInstalledVersion)) {
      return
    }

    const choice = await vscode.window.showInformationMessage(
      vscode.l10n.t('A new version of Ruyi is available: {0} (current: {1})', latestVersion, currentCoerced.version),
      vscode.l10n.t('Update now'),
      vscode.l10n.t('Later'),
    )

    if (choice === vscode.l10n.t('Update now')) {
      await vscode.commands.executeCommand('ruyi.setup.update')
    }
  }
  catch (error) {
    logger.error('Failed to check for Ruyi updates:', error)
  }
}

export function registerInstallCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.install', async () => {
    if (process.platform !== 'linux') {
      const choice = await vscode.window.showWarningMessage(
        vscode.l10n.t('Automatic installation is only supported on Linux. Please install Ruyi manually.'),
        vscode.l10n.t('Open Installation Guide'),
        vscode.l10n.t('Cancel'),
      )
      if (choice === vscode.l10n.t('Open Installation Guide')) {
        vscode.env.openExternal(vscode.Uri.parse(INSTALLATION_GUIDE_URL))
      }
      return
    }

    const existingInstallation = await detectRuyiInstallation()
    if (existingInstallation?.version) {
      vscode.window.showInformationMessage(vscode.l10n.t('Ruyi already installed: {0}', existingInstallation.version))
      return
    }

    const methods = Object.entries(PACKAGE_METHODS) as Array<[PackageMethodKey, PackageMethod]>
    for (let i = 0; i < methods.length; i++) {
      const [methodName] = methods[i]
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Installing Ruyi via {0}...', methodName),
            cancellable: false,
          },
          () => executeRuyiInstall(methodName, { timeout: 60000 }),
        )

        await handleSuccessAndPromptReload('install', methodName)
        return
      }
      catch (error) {
        const nextMethodName = methods[i + 1]?.[0]
        const details = getErrorDetails(error)
        logger.log(`${methodName} install failed: ${details}`)

        if (nextMethodName) {
          await vscode.window.showWarningMessage(
            vscode.l10n.t('{0} installation failed. Trying {1} instead...', methodName, nextMethodName),
            vscode.l10n.t('OK'),
          )
        }
        else {
          await showErrorWithCopyDetails('install', methodName, error)
        }
      }
    }

    const manualChoice = await vscode.window.showErrorMessage(
      vscode.l10n.t('Automatic installation failed. Please install Ruyi manually.'),
      vscode.l10n.t('Open Installation Guide'),
      vscode.l10n.t('Cancel'),
    )

    if (manualChoice === vscode.l10n.t('Open Installation Guide')) {
      vscode.env.openExternal(vscode.Uri.parse(INSTALLATION_GUIDE_URL))
    }
  })

  ctx.subscriptions.push(disposable)
}

export function registerUpdateCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.update', async () => {
    const selectedMethod = await vscode.window.showQuickPick(
      Object.keys(PACKAGE_METHODS),
      { placeHolder: vscode.l10n.t('Select the installation method you used to install Ruyi') },
    )
    if (!selectedMethod) {
      return
    }

    const method = PACKAGE_METHODS[selectedMethod as PackageMethodKey]
    if (!method) {
      vscode.window.showWarningMessage(vscode.l10n.t('Unknown installation method: {0}', selectedMethod))
      return
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t('Updating Ruyi via {0}...', selectedMethod),
          cancellable: false,
        },
        async () => {
          await executeRuyiUpdate(selectedMethod as PackageMethodKey, { timeout: 60000 })
        },
      )

      await handleSuccessAndPromptReload('update', selectedMethod)
    }
    catch (error) {
      await showErrorWithCopyDetails('update', selectedMethod, error)
    }
  })

  ctx.subscriptions.push(disposable)
}
