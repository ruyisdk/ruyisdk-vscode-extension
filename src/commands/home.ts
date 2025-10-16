// SPDX-License-Identifier: Apache-2.0
/**
 * Home Command Registration
 */

import * as vscode from 'vscode'

import showHomePanel from '../features/home/HomePanel'

export default function registerHomeCommand(ctx: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.home.show', () => showHomePanel(ctx))

  ctx.subscriptions.push(disposable)
}
