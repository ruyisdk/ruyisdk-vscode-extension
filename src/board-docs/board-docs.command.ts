// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import * as provider from './board-docs-webview.provider'

export default function registerBoardDocsCommands(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.board-docs', () => provider.showBoardDocsPanel(ctx)),
  )
}
