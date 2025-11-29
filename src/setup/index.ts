// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import registerDetectCommand from './detect.command'
import registerManageCommand from './manage.command'
import { manageService } from './manage.service'
import registerSetupCommand from './setup.command'

export default function registerSetupModule(ctx: vscode.ExtensionContext) {
  registerDetectCommand(ctx)
  registerSetupCommand(ctx)
  registerManageCommand(ctx)

  manageService.initialize(ctx)
  ctx.subscriptions.push(manageService)
}
