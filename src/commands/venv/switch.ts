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

import { VenvTreeItem } from '../../features/venv/VenvTree'

import { manageRuyiTerminal, currentVenv } from './manageCurrentVenv'

export default function registerSwitchFromVenvsCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.switch', async (venv?: VenvTreeItem) => {
    // Invoke detectVenv command to let user pick a venv to operate.
    if (!venv) {
      return
    }
    // Manage the Ruyi terminal for venv activation/deactivation
    const venvPath = `./${venv.venvPath}`
    manageRuyiTerminal(venvPath === currentVenv ? null : venvPath)

    // Refresh the venv tree view to reflect the current active venv
    await vscode.commands.executeCommand('ruyi.venv.refresh')
  })
  context.subscriptions.push(disposable)
}
