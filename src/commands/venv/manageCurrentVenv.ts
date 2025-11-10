// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Terminal Management Helper
 * Not a command by itself
 *
 * Manages a dedicated terminal for Ruyi venv activation and deactivation.
 * Keeps track of the current active venv and ensures proper cleanup on terminal closure.
 */

import * as vscode from 'vscode'

import { venvTree } from './detect'

let ruyiTerminal: vscode.Terminal | undefined
export let currentVenv: string | undefined

// Watch for terminal close event to reset currentVenv and ruyiTerminal
export default function registerTerminalHandlerCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === ruyiTerminal) {
        ruyiTerminal = undefined
        currentVenv = undefined
        vscode.window.showInformationMessage('Ruyi Venv Terminal closed, venv deactivated.')
      }
    }),
  )
}

// Get or create the Ruyi terminal for venv activation, assigning a venv path to it.
export function manageRuyiTerminal(venvPath: string | null, venvName: string | null) {
  if (!ruyiTerminal) {
    if (venvPath) {
      ruyiTerminal = vscode.window.createTerminal({ name: 'Ruyi Venv Terminal', shellPath: '/bin/bash' })
      ruyiTerminal.show()
      venvTree.setCurrentVenv(venvPath, venvName)
      vscode.window.showInformationMessage(`Ruyi venv activated: ${venvPath}`)
    }
    else {
      venvTree.setCurrentVenv(null, null)
      vscode.window.showInformationMessage('No Ruyi venv is currently active.')
      return
    }
  }
  if (venvPath === null) {
    // Deactivate current venv
    ruyiTerminal.sendText('ruyi-deactivate')
    currentVenv = undefined
    venvTree.setCurrentVenv(null, null)
    vscode.window.showInformationMessage('Ruyi venv deactivated.')
  }
  else if (venvPath !== currentVenv) {
    // Activate new venv
    if (currentVenv) {
      ruyiTerminal.sendText('ruyi-deactivate')
    }
    ruyiTerminal.sendText(`source ${venvPath}/bin/ruyi-activate`)
    currentVenv = venvPath
    venvTree.setCurrentVenv(venvPath, venvName)
    vscode.window.showInformationMessage(`Ruyi venv activated: ${venvPath}`)
  }
  // Trying to activate the same venv, although shouldn't reach here due to earlier check.
  else {
    vscode.window.showInformationMessage(`Ruyi venv already active: ${venvPath}`)
  }
}
