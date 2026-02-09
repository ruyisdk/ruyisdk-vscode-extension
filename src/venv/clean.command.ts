// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import type { VenvService } from './venv.service'

/**
 * Executes the clean venv command.
 * Removes a virtual environment directory.
 *
 * @param service - The venv service instance
 * @param venvPath - The path of the virtual environment to remove
 */
export async function cleanVenvCommand(
  service: VenvService,
  venvPath: string,
): Promise<void> {
  if (!venvPath) {
    vscode.window.showErrorMessage('Invalid virtual environment: no path found.')
    return
  }

  const confirm = await vscode.window.showWarningMessage(
    'Delete the selected venv? This action cannot be undone.',
    { modal: true },
    'Delete',
  )

  if (confirm !== 'Delete') {
    return
  }

  await service.removeVenv(venvPath)
}

/**
 * Registers the clean venv command.
 * @param ctx - The extension context
 * @param service - The venv service instance
 */
export default function registerCleanCommand(ctx: vscode.ExtensionContext, service: VenvService): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.venv.clean', async (arg?: unknown) => {
      let venvPath: string | undefined

      // Adapter Logic: Handle different argument types
      if (typeof arg === 'string') {
        venvPath = arg
      }
      else if (arg && typeof arg === 'object' && 'venvPath' in arg) {
        // Duck typing for VenvItem
        venvPath = (arg as { venvPath: string }).venvPath
      }

      if (!venvPath) {
        // Optional: Maybe show a quick pick if no path provided?
        // For now, just error out as this is usually triggered from UI context menu
        vscode.window.showErrorMessage('No virtual environment selected.')
        return
      }

      await cleanVenvCommand(service, venvPath)
    }),
  )
}
