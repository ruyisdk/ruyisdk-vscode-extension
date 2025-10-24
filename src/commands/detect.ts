// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as vscode from 'vscode'

import ruyi, { resolveRuyi } from '../common/ruyi'
import { promptForTelemetryConfiguration } from '../features/telemetry/TelemetryService'

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
    }
    else {
      vscode.window.showWarningMessage(
        `Ruyi found at ${ruyiPath} but version check failed. Please check your installation.`,
      )
    }
  })
  context.subscriptions.push(disposable)
}
