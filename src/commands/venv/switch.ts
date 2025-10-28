// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Switch Command
 *
 * VS Code command ID: `ruyi.venv.switch`
 *
 * Responsibilities:
 * - Switch to a different Ruyi virtual environment or deactivate the current one.
 * - Automatically run upon extension activation.
 */

import * as vscode from 'vscode'

import { manageRuyiTerminal, currentVenv } from './manageTerminal'

export default function registerSwitchFromVenvsCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.switch', async (active: boolean = true) => {
    // Invoke detectVenv command to let user pick a venv to operate.
    const pickedVenv = await vscode.commands.executeCommand('ruyi.venv.detect', 'switch', active) as
      { label: string, description: string, rawPath: string } | undefined
    if (!pickedVenv) {
      return
    }
    // Manage the Ruyi terminal for venv activation/deactivation
    const venvPath = `./${pickedVenv.rawPath}`
    manageRuyiTerminal(venvPath === currentVenv ? null : venvPath)
  })
  context.subscriptions.push(disposable)
}
