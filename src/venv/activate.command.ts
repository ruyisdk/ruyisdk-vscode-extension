// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { resolveVenvPathArg } from './venv.helper'
import type { VenvService } from './venv.service'

/**
 * Executes the activate venv command.
 * Activates a specific venv in the Ruyi terminal.
 *
 * @param service - The venv service instance
 * @param venvPath - The path to the virtual environment to activate
 */
export function activateVenvCommand(
  service: VenvService,
  venvPath: string,
): void {
  if (!venvPath.trim()) {
    vscode.window.showErrorMessage(vscode.l10n.t('Invalid virtual environment: no path found.'))
    return
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspaceRoot) {
    vscode.window.showWarningMessage(vscode.l10n.t('Open a workspace folder before activating a Ruyi venv.'))
    return
  }

  const absoluteVenvPath = path.resolve(workspaceRoot, venvPath)

  if (service.getCurrentVenv() === absoluteVenvPath) {
    vscode.window.showInformationMessage(vscode.l10n.t('Virtual environment is already active.'))
    return
  }

  service.activateVenv(absoluteVenvPath)
}

/**
 * Registers the activate venv command.
 * @param ctx - The extension context
 * @param service - The venv service instance
 */
export default function registerActivateCommand(ctx: vscode.ExtensionContext, service: VenvService): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.venv.activate', (arg?: unknown) => {
      const venvPath = resolveVenvPathArg(arg)

      if (venvPath === undefined) {
        vscode.window.showErrorMessage(vscode.l10n.t('No virtual environment selected.'))
        return
      }

      activateVenvCommand(service, venvPath)
    }),
  )
}
