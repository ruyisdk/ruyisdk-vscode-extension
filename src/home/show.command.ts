// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { showHomePanel } from './home-panel.provider'

export default function registerShowCommand(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.home.show', () => showHomePanel(ctx)),
  )
}
