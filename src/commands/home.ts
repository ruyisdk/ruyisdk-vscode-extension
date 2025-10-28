// SPDX-License-Identifier: Apache-2.0
/**
 * Home Command Registration
 */

import * as vscode from 'vscode'

import showHomePanel from '../features/home/HomePanel'

export default function registerHomeCommand(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.home.show', () => showHomePanel(ctx)),
  )
}
