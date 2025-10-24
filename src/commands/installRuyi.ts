// SPDX-License-Identifier: Apache-2.0
/**
 * InstallCommand
 *
 * VS Code command: `ruyi.install`
 *
 * Responsibilities:
 * - Check platform support
 * - Resolve Python interpreter from candidates (python3/python/py)
 * - Ask user for confirmation and show progress
 * - Perform pip install and report result
 */

import * as cp from 'child_process'
import type { ExecException } from 'node:child_process'
import * as util from 'util'
import * as vscode from 'vscode'

import ruyi, { resolveRuyi } from '../common/ruyi'
import { promptForTelemetryConfiguration } from '../features/telemetry/TelemetryService'

const execAsync = util.promisify(cp.exec)

async function showInstallSuccess(method: string, version: string): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    `Ruyi installed via ${method}: ${version}`,
    'Reload Window',
    'Later',
  )
  if (action === 'Reload Window') {
    await vscode.commands.executeCommand('workbench.action.reloadWindow')
  }
}

async function showInstallError(method: string, errorMessage: string, continueMessage?: string): Promise<void> {
  console.log(`[RuyiSDK] ${method} install failed: ${errorMessage}`)

  const message = continueMessage
    ? `${method} installation failed: ${errorMessage}. ${continueMessage}`
    : `${method} installation failed: ${errorMessage}`

  await vscode.window.showWarningMessage(message, 'OK')
}

export default function registerInstallCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.install', async () => {
    if (process.platform !== 'linux') {
      const choice = await vscode.window.showWarningMessage(
        'Automatic installation is only supported on Linux. Please install Ruyi manually.',
        'Open Installation Guide',
        'Cancel',
      )
      if (choice === 'Open Installation Guide') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://ruyisdk.org/en/docs/Package-Manager/installation'),
        )
      }
      return
    }

    const existingRuyi = await resolveRuyi()
    if (existingRuyi) {
      const version = await ruyi.version()
      if (version) {
        vscode.window.showInformationMessage(`Ruyi already installed: ${version}`)
        return
      }
    }

    const choice = await vscode.window.showInformationMessage(
      'Ruyi not found. Would you like to install it automatically?',
      'Install',
      'Cancel',
    )
    if (choice !== 'Install') return

    const commands = [
      { name: 'pip', cmd: 'python3 -m pip install --user -U ruyi' },
      { name: 'pipx', cmd: 'python3 -m pipx install ruyi' },
    ]

    for (let i = 0; i < commands.length; i++) {
      const { name, cmd } = commands[i]
      try {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Installing Ruyi via ${name}...`,
          cancellable: false,
        }, async () => {
          await execAsync(cmd, { timeout: 60_000 })
        })

        const version = await ruyi.version()
        if (version) {
          await showInstallSuccess(name, version)
          await promptForTelemetryConfiguration()
          return
        }
      }
      catch (e) {
        const error = e as ExecException
        const errorMessage = error.stderr || error.message || String(error)
        const isLastCommand = i === commands.length - 1
        const continueMessage = isLastCommand ? 'Will show manual installation options.' : `Trying ${commands[i + 1]?.name} instead...`
        await showInstallError(name, errorMessage, continueMessage)
      }
    }

    const manualChoice = await vscode.window.showErrorMessage(
      'Automatic installation failed. Please install Ruyi manually.',
      'Open Installation Guide',
      'Cancel',
    )

    if (manualChoice === 'Open Installation Guide') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://ruyisdk.org/en/docs/Package-Manager/installation'),
      )
    }
  })
  context.subscriptions.push(disposable)
}
