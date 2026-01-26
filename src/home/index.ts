// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import registerShowCommand from './show.command'

export default function registerHomeModule(ctx: vscode.ExtensionContext) {
  registerShowCommand(ctx)
}
