// SPDX-License-Identifier: Apache-2.0
/**
 * CreateCommand
 *
 * VS Code command: `ruyi.venv.switch`
 *
 * Responsibilities:
 * - Switch to a different Ruyi virtual environment or deactivate the current one
 * - Implementated by invoking `detectVenv` command to let user pick a venv to operate
 */

import * as vscode from 'vscode'

// import {isSupportedPlatform} from '../common/utils';
// import {createVenv} from '../features/venv/CreateVenv';

export let currentVenv: string | undefined
let ruyiTerminal: vscode.Terminal | undefined

export default function registerSwitchFromVenvsCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.switch', async () => {
    // Invoke detectVenv command to let user pick a venv to operate.
    const pickedVenv = await vscode.commands.executeCommand('ruyi.venv.detect', 'switch') as
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

// Get or create the Ruyi terminal for venv activation, assigning a venv path to it.
// This function is not defined more globally because only this command needs it currently.
function manageRuyiTerminal(venvPath: string | null) {
  if (!ruyiTerminal) {
    if (venvPath) {
      ruyiTerminal = vscode.window.createTerminal({ name: 'Ruyi Venv Terminal' })
      ruyiTerminal.show()
      vscode.window.showInformationMessage(`Ruyi venv activated: ${venvPath}`)

      // Watch for terminal close event to reset currentVenv and ruyiTerminal
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === ruyiTerminal) {
          ruyiTerminal = undefined
          currentVenv = undefined
          vscode.window.showInformationMessage('Ruyi Venv Terminal closed, venv deactivated.')
        }
      })
    }
    else {
      vscode.window.showInformationMessage('No Ruyi venv is currently active.')
      return
    }
  }
  if (venvPath === null) {
    // Deactivate current venv
    ruyiTerminal.sendText('ruyi-deactivate')
    currentVenv = undefined
    vscode.window.showInformationMessage('Ruyi venv deactivated.')
  }
  else if (venvPath !== currentVenv) {
    // Activate new venv
    if (currentVenv) {
      ruyiTerminal.sendText('ruyi-deactivate')
    }
    ruyiTerminal.sendText(`source ${venvPath}/bin/ruyi-activate`)
    currentVenv = venvPath
    vscode.window.showInformationMessage(`Ruyi venv activated: ${venvPath}`)
  }
  // Trying to activate the same venv, although shouldn't reach here due to earlier check.
  else {
    vscode.window.showInformationMessage(`Ruyi venv already active: ${venvPath}`)
  }
}
