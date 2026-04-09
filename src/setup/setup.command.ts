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

const INSTALLATION_GUIDE_URL = 'https://ruyisdk.org/en/docs/Package-Manager/installation'

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

  const action = await vscode.window.showErrorMessage(
    `${operation === 'install' ? 'Installation' : 'Update'} failed via ${methodName}.`,
    'Copy Details',
    'OK',
  )

  if (action === 'Copy Details') {
    await vscode.env.clipboard.writeText(details)
    await vscode.window.showInformationMessage('Error details copied to clipboard.')
  }
}

async function handleSuccessAndPromptReload(
  action: 'install' | 'update',
  methodName: string,
): Promise<void> {
  const installation = await detectRuyiInstallation()
  const version = installation?.version

  const successMessage = action === 'install'
    ? `Ruyi installed via ${methodName}: ${version}`
    : `Ruyi updated via ${methodName}: ${version}`

  const verificationFailureMessage = action === 'install'
    ? 'Installation completed, but Ruyi installation could not be verified. Please reload the window manually.'
    : 'Update completed, but the local Ruyi version could not be verified. Please reload the window manually.'

  if (version) {
    await vscode.commands.executeCommand('ruyi.packages.refresh')
    const userAction = await vscode.window.showInformationMessage(
      successMessage,
      'Reload Window',
      'Later',
    )
    if (userAction === 'Reload Window') {
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
      `A new version of Ruyi is available: ${latestVersion} (current: ${currentCoerced.version})`,
      'Update now',
      'Later',
    )

    if (choice === 'Update now') {
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
        'Automatic installation is only supported on Linux. Please install Ruyi manually.',
        'Open Installation Guide',
        'Cancel',
      )
      if (choice === 'Open Installation Guide') {
        vscode.env.openExternal(vscode.Uri.parse(INSTALLATION_GUIDE_URL))
      }
      return
    }

    const existingInstallation = await detectRuyiInstallation()
    if (existingInstallation?.version) {
      vscode.window.showInformationMessage(`Ruyi already installed: ${existingInstallation.version}`)
      return
    }

    const methods = Object.entries(PACKAGE_METHODS) as Array<[PackageMethodKey, PackageMethod]>
    for (let i = 0; i < methods.length; i++) {
      const [methodName] = methods[i]
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Installing Ruyi via ${methodName}...`,
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
            `${methodName} installation failed. Trying ${nextMethodName} instead...`,
            'OK',
          )
        }
        else {
          await showErrorWithCopyDetails('install', methodName, error)
        }
      }
    }

    const manualChoice = await vscode.window.showErrorMessage(
      'Automatic installation failed. Please install Ruyi manually.',
      'Open Installation Guide',
      'Cancel',
    )

    if (manualChoice === 'Open Installation Guide') {
      vscode.env.openExternal(vscode.Uri.parse(INSTALLATION_GUIDE_URL))
    }
  })

  ctx.subscriptions.push(disposable)
}

export function registerUpdateCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.update', async () => {
    const selectedMethod = await vscode.window.showQuickPick(
      Object.keys(PACKAGE_METHODS),
      { placeHolder: 'Select the installation method you used to install Ruyi' },
    )
    if (!selectedMethod) {
      return
    }

    const method = PACKAGE_METHODS[selectedMethod as PackageMethodKey]
    if (!method) {
      vscode.window.showWarningMessage(`Unknown installation method: ${selectedMethod}`)
      return
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Updating Ruyi via ${selectedMethod}...`,
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
