// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import registerCleanCommand from './clean.command'
import { registerDetectCommand, registerManageCommand } from './manage.command'
import { manageService } from './manage.service'
import { registerInstallCommand, registerUpdateCommand } from './setup.command'
import registerTelemetryCommand from './telemetry.command'
import { telemetryService } from './telemetry.service'

export const MINIMUM_SUPPORTED_RUYI_VERSION = '0.48.0'

export default function registerSetupModule(ctx: vscode.ExtensionContext): void {
  // Register commands
  registerCleanCommand(ctx)
  registerDetectCommand(ctx)
  registerManageCommand(ctx)
  registerInstallCommand(ctx)
  registerUpdateCommand(ctx)
  registerTelemetryCommand(ctx)

  manageService.initialize()
  ctx.subscriptions.push(manageService, telemetryService)
}
