// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import registerAddRepoCommand from './add.command'
import registerDisableRepoCommand from './disable.command'
import registerEnableRepoCommand from './enable.command'
import registerManageRepoCommand from './manage.command'
import registerRemoveRepoCommand from './remove.command'
import registerSetPriorityCommand from './set-priority.command'

export default function registerRepoModule(ctx: vscode.ExtensionContext): void {
  registerManageRepoCommand(ctx)
  registerAddRepoCommand(ctx)
  registerRemoveRepoCommand(ctx)
  registerSetPriorityCommand(ctx)
  registerEnableRepoCommand(ctx)
  registerDisableRepoCommand(ctx)
}
