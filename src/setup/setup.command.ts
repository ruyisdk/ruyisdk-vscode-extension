// SPDX-License-Identifier: Apache-2.0
import * as cp from 'child_process'
import type { ExecException } from 'node:child_process'
import * as util from 'util'
import * as vscode from 'vscode'

import * as semver from 'semver'

import { logger } from '../common/logger'

import { detectRuyiInstallation } from './manage.service'

const execAsync = util.promisify(cp.exec)

const INSTALLATION_GUIDE_URL = 'https://ruyisdk.org/en/docs/Package-Manager/installation'

const PACKAGE_METHODS = {
  pip: {
    installCmd: 'python3 -m pip install --user -U ruyi',
    updateCmd: 'python3 -m pip install --user -U ruyi',
  },
  pipx: {
    installCmd: 'python3 -m pipx install ruyi',
    updateCmd: 'python3 -m pipx upgrade ruyi',
  },
} as const

type PackageMethodKey = keyof typeof PACKAGE_METHODS
type PackageMethod = (typeof PACKAGE_METHODS)[PackageMethodKey]

export async function checkRuyiUpdate(currentVersion: string): Promise<void> {
  try {
    const coerced = semver.coerce(currentVersion)
    if (!coerced) {
      logger.warn(`Unable to parse version from: ${currentVersion}`)
      return
    }

    const response = await fetch('https://api.github.com/repos/ruyisdk/ruyi/releases/latest', {
      headers: { 'User-Agent': 'ruyisdk-vscode-extension' },
    }).catch((error: unknown) => {
      logger.error('Failed to fetch latest Ruyi version:', error)
      return null
    })
    if (!response) {
      return
    }
    if (!response.ok) {
      logger.warn(`Failed to fetch latest Ruyi release: ${response.statusText}`)
      return
    }

    const release = (await response.json()) as { tag_name: string }
    const latestVersion = release.tag_name.replace(/^v/, '')
    if (!semver.gt(latestVersion, coerced.version)) {
      return
    }

    const choice = await vscode.window.showInformationMessage(
      `A new version of Ruyi is available: ${latestVersion} (current: ${coerced.version})`,
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

    const choice = await vscode.window.showInformationMessage(
      'RuyiSDK not found. Would you like to install it automatically?',
      'Install',
      'Cancel',
    )
    if (choice !== 'Install') return

    const promptReload = async (methodLabel: string, version: string) => {
      const action = await vscode.window.showInformationMessage(
        `Ruyi installed via ${methodLabel}: ${version}`,
        'Reload Window',
        'Later',
      )
      if (action === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    }

    const methods = Object.entries(PACKAGE_METHODS) as Array<[PackageMethodKey, PackageMethod]>
    for (let i = 0; i < methods.length; i++) {
      const [methodName, method] = methods[i]
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Installing Ruyi via ${methodName}...`,
            cancellable: false,
          },
          () => execAsync(method.installCmd, { timeout: 60_000 }),
        )

        const installation = await detectRuyiInstallation()
        const version = installation?.version
        if (version) {
          await promptReload(methodName, version)
          return
        }
      }
      catch (error) {
        const execError = error as ExecException
        const errorMessage = execError.stderr || execError.message || String(error)
        const nextMethodName = methods[i + 1]?.[0]
        const followup = nextMethodName
          ? `Trying ${nextMethodName} instead...`
          : 'Will show manual installation options.'

        logger.log(`${methodName} install failed: ${errorMessage}`)

        await vscode.window.showWarningMessage(
          `${methodName} installation failed: ${errorMessage}. ${followup}`,
          'OK',
        )
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

    const terminal = vscode.window.createTerminal('Ruyi Update')
    terminal.sendText(method.updateCmd)
    terminal.show()
  })

  ctx.subscriptions.push(disposable)
}
