// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Switch Command
 *
 * VS Code command ID: `ruyi.venv.switch`
 *
 * Responsibilities:
 * - Switch to a different Ruyi virtual environment or deactivate the current one.
 */

import * as vscode from 'vscode'

import { VenvPick } from '../../common/helpers'

import { manageRuyiTerminal, currentVenv } from './manageCurrentVenv'

export default function registerSwitchFromVenvsCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.switch', async (venv?: VenvPick) => {
    // Invoke detectVenv command to let user pick a venv to operate.
    if (!venv) {
      return
    }
    // Manage the Ruyi terminal for venv activation/deactivation
    const venvPath = `./${venv.rawPath}`
    manageRuyiTerminal(venvPath === currentVenv ? null : venvPath, venvPath === currentVenv ? null : venv.label)

    // Refresh the venv tree view to reflect the current active venv
    await vscode.commands.executeCommand('ruyi.venv.refresh', false)
  })
  context.subscriptions.push(disposable)
}
