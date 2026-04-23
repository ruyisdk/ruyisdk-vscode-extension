// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import registerBoardDocsCommands from './board-docs.command'

export default function registerBoardDocsModule(ctx: vscode.ExtensionContext) {
  registerBoardDocsCommands(ctx)
}
