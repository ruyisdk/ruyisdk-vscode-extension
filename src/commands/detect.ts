// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as vscode from 'vscode'

import * as semver from 'semver'

import ruyi, { resolveRuyi } from '../common/ruyi'
import { promptForTelemetryConfiguration } from '../features/telemetry/TelemetryService'

interface GitHubRelease {
  tag_name: string
}

async function checkRuyiUpdate(currentVersion: string) {
  try {
    const coerced = semver.coerce(currentVersion)
    if (!coerced) {
      console.warn(`Unable to parse version from: ${currentVersion}`)
      return
    }

    const response = await fetch('https://api.github.com/repos/ruyisdk/ruyi/releases/latest', {
      headers: {
        'User-Agent': 'ruyisdk-vscode-extension',
      },
    })
    if (!response.ok) {
      console.warn(`Failed to fetch latest Ruyi release: ${response.statusText}`)
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
          updateMethods.map(m => m.name),
          {
            placeHolder: 'Select the installation method you used to install Ruyi',
          },
        )

        if (selectedMethod) {
          const method = updateMethods.find(m => m.name === selectedMethod)
          if (method) {
            const terminal = vscode.window.createTerminal('Ruyi Update')
            terminal.sendText(method.cmd)
            terminal.show()
          }
        }
      }
    }
  }
  catch (err) {
    console.error('Failed to check for Ruyi updates:', err)
  }
}

export default function registerDetectCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.detect', async () => {
    const ruyiPath = await resolveRuyi()

    if (!ruyiPath) {
      const choice = await vscode.window.showErrorMessage(
        'Ruyi not found.',
        'Install Ruyi',
        'Cancel',
      )
      if (choice === 'Install Ruyi') {
        vscode.commands.executeCommand('ruyi.install')
      }
      return
    }

    if ((await ruyi.telemetry()).status === 'local') {
      await promptForTelemetryConfiguration()
    }

    const version = await ruyi.version()
    if (version) {
      vscode.window.showInformationMessage(`Ruyi detected: ${version} (${ruyiPath})`)
      checkRuyiUpdate(version).catch((err) => {
        console.error('Update check failed:', err)
      })
    }
    else {
      vscode.window.showWarningMessage(
        `Ruyi found at ${ruyiPath} but version check failed. Please check your installation.`,
      )
    }
  })
  context.subscriptions.push(disposable)
}
