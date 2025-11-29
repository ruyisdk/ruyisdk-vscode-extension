// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import * as semver from 'semver'

import { configuration } from '../common/configuration'
import { logger } from '../common/logger'
import ruyi, { resolveRuyi } from '../ruyi'

interface GitHubRelease {
  tag_name: string
}

async function checkRuyiUpdate(currentVersion: string): Promise<void> {
  try {
    const coerced = semver.coerce(currentVersion)
    if (!coerced) {
      logger.warn(`Unable to parse version from: ${currentVersion}`)
      return
    }

    const response = await fetch('https://api.github.com/repos/ruyisdk/ruyi/releases/latest', {
      headers: { 'User-Agent': 'ruyisdk-vscode-extension' },
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch latest Ruyi release: ${response.statusText}`)
      return
    }

    const release = (await response.json()) as GitHubRelease
    const latestVersion = release.tag_name.replace(/^v/, '')

    if (semver.gt(latestVersion, coerced.version)) {
      const choice = await vscode.window.showInformationMessage(
        `A new version of Ruyi is available: ${latestVersion} (current: ${coerced.version})`,
        'Update now',
        'Later',
      )

      if (choice === 'Update now') {
        const updateMethods = [
          { name: 'pip', cmd: 'python3 -m pip install --user -U ruyi' },
          { name: 'pipx', cmd: 'python3 -m pipx upgrade ruyi' },
        ]

        const selectedMethod = await vscode.window.showQuickPick(
          updateMethods.map(method => method.name),
          { placeHolder: 'Select the installation method you used to install Ruyi' },
        )

        if (selectedMethod) {
          const method = updateMethods.find(item => item.name === selectedMethod)
          if (method) {
            const terminal = vscode.window.createTerminal('Ruyi Update')
            terminal.sendText(method.cmd)
            terminal.show()
          }
        }
      }
    }
  }
  catch (error) {
    logger.error('Failed to check for Ruyi updates:', error)
  }
}

export default function registerDetectCommand(ctx: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.setup.detect', async () => {
    const ruyiPath = await resolveRuyi()

    if (!ruyiPath) {
      const choice = await vscode.window.showErrorMessage(
        'Ruyi not found.',
        'Install Ruyi',
        'Cancel',
      )

      if (choice === 'Install Ruyi') {
        await vscode.commands.executeCommand('ruyi.setup')
      }
      return
    }

    const version = await ruyi.version()
    if (!version) {
      vscode.window.showWarningMessage(
        `Ruyi found at ${ruyiPath} but version check failed. Please check your installation.`,
      )
      return
    }

    vscode.window.showInformationMessage(`Ruyi detected: ${version} (${ruyiPath})`)
    if (configuration.checkForUpdates) {
      checkRuyiUpdate(version).catch((error) => {
        logger.error('Update check failed:', error)
      })
    }
  })

  ctx.subscriptions.push(disposable)
}
