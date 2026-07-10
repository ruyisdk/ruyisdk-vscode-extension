// SPDX-License-Identifier: Apache-2.0
/**
 * Telemetry command handlers
 */

import * as vscode from 'vscode'

import { telemetryService } from './telemetry.service'

export default function registerTelemetryCommand(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.telemetry.configure', async () => {
      await promptForTelemetryConfiguration()
    }),
  )
}

async function promptForTelemetryConfiguration(): Promise<void> {
  const enableAction = vscode.l10n.t('Enable (Recommended)')
  const disableAction = vscode.l10n.t('Disable')
  const choice = await vscode.window.showInformationMessage(
    vscode.l10n.t('Ruyi Telemetry: Help us improve by sending anonymous usage data. You can change this setting at any time.'),
    { modal: false },
    enableAction,
    disableAction,
  )

  switch (choice) {
    case enableAction: {
      const success = await telemetryService.setTelemetryPreference(true)
      if (success) {
        vscode.window.showInformationMessage(vscode.l10n.t('Ruyi telemetry enabled. Thank you!'))
      }
      break
    }
    case disableAction: {
      const success = await telemetryService.setTelemetryPreference(false)
      if (success) {
        vscode.window.showInformationMessage(vscode.l10n.t('Ruyi telemetry disabled.'))
      }
      break
    }
    default:
      // User dismissed the dialog; no action needed.
      break
  }
}
