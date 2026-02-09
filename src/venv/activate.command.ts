// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../common/helpers'

import type { VenvService } from './venv.service'

/**
 * Executes the activate venv command.
 * Activates a specific venv in the Ruyi terminal.
 *
 * @param service - The venv service instance
 * @param venvPath - The path to the virtual environment to activate
 */
export async function activateVenvCommand(
  service: VenvService,
  venvPath: string,
): Promise<void> {
  if (!venvPath) {
    vscode.window.showErrorMessage('Invalid virtual environment: no path found.')
    return
  }

  let workspaceRoot = ''
  try {
    workspaceRoot = getWorkspaceFolderPath()
  }
  catch {
    // Ignore if no workspace
  }

  const absVenvPath = (workspaceRoot && !path.isAbsolute(venvPath))
    ? path.resolve(workspaceRoot, venvPath)
    : venvPath

  // Check if already active
  const currentVenv = service.getCurrentVenv()
  if (currentVenv && path.normalize(currentVenv) === path.normalize(absVenvPath)) {
    vscode.window.showInformationMessage('Virtual environment is already active.')
    return
  }

  await service.activateVenv(venvPath)
}

/**
 * Registers the activate venv command.
 * @param ctx - The extension context
 * @param service - The venv service instance
 */
export default function registerActivateCommand(ctx: vscode.ExtensionContext, service: VenvService): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.venv.activate', async (arg?: unknown) => {
      let venvPath: string | undefined

      // Adapter Logic: Handle different argument types from VS Code
      if (typeof arg === 'string') {
        // Direct call with string path
        venvPath = arg
      }
      else if (arg && typeof arg === 'object' && 'venvPath' in arg) {
        // Call from Tree View Inline Button (Duck typing VenvItem)
        // VS Code passes the TreeItem instance when clicking inline actions.
        venvPath = (arg as { venvPath: string }).venvPath
      }

      if (!venvPath) {
        vscode.window.showErrorMessage('No virtual environment selected.')
        return
      }

      await activateVenvCommand(service, venvPath)
    }),
  )
}
