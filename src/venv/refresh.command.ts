// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import type { VenvTreeProvider } from './venv-tree.provider'

/**
 * Executes the refresh venv command.
 * Refreshes the venv tree view.
 */
export async function refreshVenvCommand(provider: VenvTreeProvider): Promise<void> {
  provider.refresh()
}

/**
 * Registers the refresh venv command.
 * @param ctx - The extension context
 * @param provider - The venv tree provider instance
 */
export default function registerRefreshCommand(ctx: vscode.ExtensionContext, provider: VenvTreeProvider): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.venv.refresh', () => refreshVenvCommand(provider)),
  )
}
