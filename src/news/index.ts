// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import registerNewsCommands from './news.command'

export default function registerNewsModule(ctx: vscode.ExtensionContext) {
  registerNewsCommands(ctx)
}
