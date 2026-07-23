// SPDX-License-Identifier: Apache-2.0
import type { ExecException } from 'node:child_process'
import * as vscode from 'vscode'

import * as semver from 'semver'

import { logger } from '../common/logger'

import { detectRuyiInstallation, fetchGitHubReleases, listAllInstallations } from './manage.service'
import {
  executeRuyiInstall,
  executeRuyiUpdate,
  PACKAGE_METHOD_KEYS,
} from './setup.helper'

const INSTALLATION_GUIDE_URL = vscode.l10n.t('https://ruyisdk.org/en/docs/Package-Manager/installation')

function getErrorDetails(error: unknown): string {
  const execError = error as ExecException
  return execError.stderr || execError.message || String(error)
}

async function showUpdateError(
  methodName: string,
  error: unknown,
): Promise<void> {
  const details = getErrorDetails(error)
  logger.error(`update failed via ${methodName}:`, details)

  const action = await vscode.window.showErrorMessage(
    vscode.l10n.t('{0} failed via {1}.', vscode.l10n.t('Update'), methodName),
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

  if (!version) {
    const message = action === 'install'
      ? vscode.l10n.t('Installation completed, but Ruyi installation could not be verified. Please reload the window manually.')
      : vscode.l10n.t('Update completed, but the local Ruyi version could not be verified. Please reload the window manually.')
    vscode.window.showWarningMessage(message)
    return
  }

  const message = action === 'install'
    ? vscode.l10n.t('Ruyi installed via {0}: {1}', methodName, version)
    : vscode.l10n.t('Ruyi updated via {0}: {1}', methodName, version)

  await vscode.commands.executeCommand('ruyi.packages.refresh')
  const userAction = await vscode.window.showInformationMessage(
    message,
    vscode.l10n.t('Reload Window'),
    vscode.l10n.t('Later'),
  )
  if (userAction === vscode.l10n.t('Reload Window')) {
    await vscode.commands.executeCommand('workbench.action.reloadWindow')
  }
}

export async function checkRuyiUpdate(currentVersion: string): Promise<void> {
  const currentCoerced = semver.coerce(currentVersion)
  if (!currentCoerced) {
    logger.warn(`Unable to parse version from: ${currentVersion}`)
    return
  }

  const releases = await fetchGitHubReleases()
  if (releases.length === 0) {
    return
  }

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

export function registerInstallCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.install', async () => {
    if (!['linux', 'darwin'].includes(process.platform)) {
      const choice = await vscode.window.showWarningMessage(
        vscode.l10n.t('Automatic installation is only supported on Linux and macOS. Please install Ruyi manually.'),
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

    const methods = PACKAGE_METHOD_KEYS
    let lastFailure: { methodName: string, error: unknown } | undefined
    for (const methodName of methods) {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Installing Ruyi via {0}...', methodName),
            cancellable: false,
          },
          () => executeRuyiInstall(methodName),
        )

        await handleSuccessAndPromptReload('install', methodName)
        return
      }
      catch (error) {
        const details = getErrorDetails(error)
        logger.log(`${methodName} install failed: ${details}`)
        lastFailure = { methodName, error }
      }
    }

    if (!lastFailure) {
      return
    }

    const details = getErrorDetails(lastFailure.error)
    logger.error(`Automatic installation failed via ${lastFailure.methodName}:`, details)
    const action = await vscode.window.showErrorMessage(
      vscode.l10n.t('Automatic installation failed. Please install Ruyi manually.'),
      vscode.l10n.t('Copy Details'),
      vscode.l10n.t('Open Installation Guide'),
      vscode.l10n.t('Cancel'),
    )

    if (action === vscode.l10n.t('Copy Details')) {
      await vscode.env.clipboard.writeText(details)
      await vscode.window.showInformationMessage(vscode.l10n.t('Error details copied to clipboard.'))
    }
    else if (action === vscode.l10n.t('Open Installation Guide')) {
      await vscode.env.openExternal(vscode.Uri.parse(INSTALLATION_GUIDE_URL))
    }
  })

  ctx.subscriptions.push(disposable)
}

export function registerUpdateCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.update', async () => {
    const selection = await vscode.window.showQuickPick(
      PACKAGE_METHOD_KEYS.map(method => ({ label: method, method })),
      { placeHolder: vscode.l10n.t('Select the installation method you used to install Ruyi') },
    )
    if (!selection) {
      return
    }
    const selectedMethod = selection.method

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t('Updating Ruyi via {0}...', selectedMethod),
          cancellable: false,
        },
        () => executeRuyiUpdate(selectedMethod),
      )

      await handleSuccessAndPromptReload('update', selectedMethod)
    }
    catch (error) {
      await showUpdateError(selectedMethod, error)
    }
  })

  ctx.subscriptions.push(disposable)
}
