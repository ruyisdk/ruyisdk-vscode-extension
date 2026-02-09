// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import type { VenvService } from './venv.service'

/**
 * Executes the deactivate venv command.
 * Deactivates the currently active venv.
 *
 * @param service - The venv service instance
 */
export async function deactivateVenvCommand(
  service: VenvService,
): Promise<void> {
  if (!service.getCurrentVenv()) {
    vscode.window.showErrorMessage('No virtual environment is currently active.')
    return
  }

  await service.deactivateVenv()
}

/**
 * Registers the deactivate venv command.
 * @param ctx - The extension context
 * @param service - The venv service instance
 */
export default function registerDeactivateCommand(ctx: vscode.ExtensionContext, service: VenvService): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.venv.deactivate', async () => {
      await deactivateVenvCommand(service)
    }),
  )
}
