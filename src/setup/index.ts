// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { registerDetectCommand, registerManageCommand } from './manage.command'
import { manageService } from './manage.service'
import { registerInstallCommand, registerUpdateCommand } from './setup.command'
import registerTelemetryCommand from './telemetry.command'
import { telemetryService } from './telemetry.service'

export default function registerSetupModule(ctx: vscode.ExtensionContext): void {
  // Register commands
  registerDetectCommand(ctx)
  registerManageCommand(ctx)
  registerInstallCommand(ctx)
  registerUpdateCommand(ctx)
  registerTelemetryCommand(ctx)

  // Initialize manage service
  manageService.initialize(ctx)
  ctx.subscriptions.push(manageService)
  // Initialize telemetry service
  ctx.subscriptions.push(telemetryService)
}
