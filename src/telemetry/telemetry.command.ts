// SPDX-License-Identifier: Apache-2.0
/**
 * Telemetry command handlers
 */

import * as vscode from 'vscode'

import { telemetryService } from './telemetry.service'

export default function registerTelemetryCommands(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.telemetry.configure', async () => {
      await promptForTelemetryConfiguration()
    }),
  )
}

export async function promptForTelemetryConfiguration(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'Ruyi Telemetry: Help us improve by sending anonymous usage data. You can change this setting at any time.',
    { modal: false },
    'Enable (Recommended)',
    'Disable',
  )

  switch (choice) {
    case 'Enable (Recommended)': {
      const success = await telemetryService.setTelemetryPreference(true)
      if (success) {
        vscode.window.showInformationMessage('Ruyi telemetry enabled. Thank you!')
      }
      break
    }
    case 'Disable': {
      const success = await telemetryService.setTelemetryPreference(false)
      if (success) {
        vscode.window.showInformationMessage('Ruyi telemetry disabled.')
      }
      break
    }
    default:
      // User dismissed the dialog; no action needed.
      break
  }
}
