// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import registerTelemetryCommands from './telemetry.command'
import { telemetryService } from './telemetry.service'

export default function registerTelemetryModule(ctx: vscode.ExtensionContext) {
  registerTelemetryCommands(ctx)
  ctx.subscriptions.push(telemetryService)

  telemetryService.syncFromConfiguration().catch((err) => {
    vscode.window.showErrorMessage(`Failed to initialize telemetry: ${err instanceof Error ? err.message : String(err)}`)
  })
}

export { promptForTelemetryConfiguration } from './telemetry.command'
