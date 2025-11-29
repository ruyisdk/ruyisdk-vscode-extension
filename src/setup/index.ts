// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { registerDetectCommand, registerManageCommand } from './manage.command'
import { manageService } from './manage.service'
import { registerInstallCommand, registerUpdateCommand } from './setup.command'

export default function registerSetupModule(ctx: vscode.ExtensionContext): void {
  // Register commands
  registerDetectCommand(ctx)
  registerManageCommand(ctx)
  registerInstallCommand(ctx)
  registerUpdateCommand(ctx)

  // Initialize manage service
  manageService.initialize(ctx)
  ctx.subscriptions.push(manageService)
}
